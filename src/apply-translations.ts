import fs from 'fs';
import path from 'path';
import { configContext, I18nInjectorConfig } from './config.js';
import { initMergeMessages } from './merge-messages.js';
import { setFileToAST } from './utils/ast.js';
import {
	extractTextFromJSXAttributeValue,
	extractTextFromJSXText,
	getLastFileAndFolder,
} from './utils/extractions.js';
import { loadGeneratedMessages } from './load-generated-messages.js';
import { parseStatement, toSafeIdentifier } from './utils/misc.js';
import traverseModule, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import parser from '@babel/parser';

import * as generatorModule from '@babel/generator';
import chalk from 'chalk';
import {
	componentHasUseTranslationsHook,
	componentUsesTranslation,
	injectI18nImport,
} from './utils/i18n-inejection.js';

const generate =
	(generatorModule as any).default?.generate ??
	(generatorModule as any).generate;

const traverse =
	(traverseModule as any).default ?? (traverseModule as typeof traverseModule);

export interface ApplyOptions {
	dry: boolean;
}
let isDryMode = false;

// ----------------- ENSURE USE TRANSLATIONS IS USED -----------------
function ensureUseTranslation(ast: t.File, namespace: string): boolean {
	injectI18nImport(ast);
	const hookIdentifier = toSafeIdentifier(namespace);
	let didInject = false;

	traverse(ast, {
		// ---------- Function Components ----------
		FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
			const name = path.node.id?.name;
			if (!name || name[0] !== name[0].toUpperCase()) return;

			const bodyPath = path.get('body');
			if (!bodyPath.isBlockStatement()) return;

			const usesTranslation = componentUsesTranslation(
				bodyPath,
				hookIdentifier
			);

			if (!usesTranslation) return;

			const hasHook = componentHasUseTranslationsHook(
				bodyPath,
				hookIdentifier,
				namespace
			);

			if (hasHook) return;

			bodyPath.unshiftContainer(
				'body',
				parseStatement(
					`const ${hookIdentifier} = useTranslations("${namespace}");`
				)
			);

			didInject = true;
		},

		// ---------- Arrow Function Components ----------
		ArrowFunctionExpression(path: NodePath<t.ArrowFunctionExpression>) {
			const parent = path.parentPath;

			const componentName =
				parent.isVariableDeclarator() && t.isIdentifier(parent.node.id)
					? parent.node.id.name
					: null;

			const isComponent =
				(componentName &&
					componentName[0] === componentName[0].toUpperCase()) ||
				parent.isExportDefaultDeclaration();

			if (!isComponent) return;

			// ---- Block body ----
			if (path.node.body.type === 'BlockStatement') {
				const bodyPath = path.get('body') as NodePath<t.BlockStatement>;

				const usesTranslation = componentUsesTranslation(
					bodyPath,
					hookIdentifier
				);
				if (!usesTranslation) return;

				const hasHook = componentHasUseTranslationsHook(
					bodyPath,
					hookIdentifier,
					namespace
				);
				if (hasHook) return;

				bodyPath.unshiftContainer(
					'body',
					parseStatement(
						`const ${hookIdentifier} = useTranslations("${namespace}");`
					)
				);

				didInject = true;
				return;
			}

			// ---- Concise arrow body ----
			const exprPath = path.get('body') as NodePath<t.Expression>;

			const usesTranslation = componentUsesTranslation(
				exprPath,
				hookIdentifier
			);

			if (!usesTranslation) return;

			const exprCode = generate(exprPath.node).code;

			path.node.body = parser.parseExpression(`
        {
          const ${hookIdentifier} = useTranslations("${namespace}");
          return (${exprCode});
        }
      `);

			didInject = true;
		},
	});

	return didInject;
}

// ----------------- REPLACE STATIC TEXT WITH t("key") -----------------
function replaceStaticText(filePath: string) {
	const ast = setFileToAST(filePath);
	if (!ast) {
		console.warn('❌ No AST generated for', filePath);
		return;
	}
	const config = configContext.get();
	let isModified = false;
	const fileFolderKey = getLastFileAndFolder(filePath);
	const newMessages = loadGeneratedMessages();
	const fileMessages = newMessages[fileFolderKey] || {};
	const hookIdentifier = toSafeIdentifier(fileFolderKey);

	traverse(ast, {
		JSXText(path: NodePath<t.JSXText>) {
			const text = extractTextFromJSXText(
				path.node.value,
				config.ignoreWords,
				config.rulesToSkip || []
			);

			if (!text) return;

			const textKey = Object.keys(fileMessages).find(
				(key) => (fileMessages as Record<string, string>)[key] === text
			);
			if (!textKey) return;
			isModified = true;
			console.log(`  • "${text}" → ${hookIdentifier}("${textKey}")`);

			if (isDryMode) return;

			// Replace JSXText with expression container
			path.replaceWith({
				type: 'JSXExpressionContainer',
				expression: parser.parseExpression(`${hookIdentifier}("${textKey}")`),
			});
		},

		JSXAttribute(path: NodePath<t.JSXAttribute>) {
			const attrValue = path.node.value;
			if (!attrValue) {
				return;
			}

			const attrName = path.node.name.name;
			if (typeof attrName !== 'string') return;

			// Skip non-configured attributes
			if (!config.jsxAttributes.includes(attrName)) return;
			let text: string | null = null;

			// Handle expression container with string literal
			if (
				t.isJSXExpressionContainer(attrValue) &&
				t.isStringLiteral(attrValue.expression)
			) {
				text =
					extractTextFromJSXAttributeValue(
						attrValue.expression.value,
						config.ignoreWords,
						config.rulesToSkip || []
					) ?? null;
			}

			// Handle direct string literal
			if (t.isStringLiteral(attrValue)) {
				text =
					extractTextFromJSXAttributeValue(
						attrValue.value,
						config.ignoreWords,
						config.rulesToSkip || []
					) ?? null;
			}

			if (!text) return;

			const textKey = Object.keys(fileMessages).find(
				(key) => (fileMessages as Record<string, string>)[key] === text
			);
			if (!textKey) return;

			isModified = true;
			console.log(
				`  • [${attrName}="${text}"] → ${hookIdentifier}("${textKey}")`
			);
			if (isDryMode) return;

			// Replace attribute value with expression container
			path.node.value = {
				type: 'JSXExpressionContainer',
				expression: parser.parseExpression(`${hookIdentifier}("${textKey}")`),
			};
		},
	});

	if (!isModified || isDryMode) return null;

	ensureUseTranslation(ast, fileFolderKey);

	const { code: output } = generate(ast, { jsescOption: { minimal: true } });
	return output;
}

// ----------------- SCAN THROUGH PROJECT -----------------
async function scanDirectory(dir: string) {
	const config = configContext.get();
	for (const entry of fs.readdirSync(dir)) {
		if (config.ignoreDirs.includes(entry)) continue;

		const full = path.join(dir, entry);
		const isDir = await fs.promises
			.stat(full)
			.then((stat) => stat.isDirectory());

		if (isDir) {
			await scanDirectory(full);
			continue;
		}

		const ext = path.extname(entry);
		if (!config.validExtensions.includes(ext)) continue;

		const newCode = replaceStaticText(full);

		if (!newCode) {
			continue;
		}

		if (isDryMode) {
			console.log('    → CHANGES DETECTED (dry-run)');
			return;
		}

		fs.writeFileSync(full, newCode, 'utf-8');
		console.log(
			'✅',
			`${chalk.underline.greenBright('Translations applied successfully')} `
		);
	}
}

// ----------------- EXECUTION -----------------
export async function initApplyTranslations(options: ApplyOptions) {
	isDryMode = options.dry;
	if (!isDryMode) {
		initMergeMessages();
	}
	await configContext.init();

	if (!configContext.isInitialized()) {
		throw new Error('Configuration not loaded.');
	}
	const nextintlConfig: I18nInjectorConfig = configContext.get();

	try {
		await scanDirectory(nextintlConfig.projectRootDir);
	} catch (error) {
		console.error('Error scanning directory:', error);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	initApplyTranslations({ dry: false });
}
