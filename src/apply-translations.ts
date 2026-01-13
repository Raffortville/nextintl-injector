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
import {
	deleteGeneratedMessagesFile,
	loadGeneratedMessages,
} from './load-generated-messages.js';
import { parseStatement, toSafeIdentifier } from './utils/misc.js';
import traverseModule, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import parser from '@babel/parser';

import * as generatorModule from '@babel/generator';
import chalk from 'chalk';
import {
	componentHasGetTranslations,
	componentHasUseTranslationsHook,
	componentUsesTranslation,
	injectI18nImport,
	isAsyncComponent,
	isReactComponentFunction,
} from './utils/i18n-inejection.js';

const generate =
	(generatorModule as any).default?.generate ??
	(generatorModule as any).generate;

const traverse =
	(traverseModule as any).default ?? (traverseModule as typeof traverseModule);

interface ApplyOptions {
	dry: boolean;
}
interface ApplyResult {
	scannedFiles: number;
	modifiedFiles: number;
	skippedFiles: number;
	errors: number;
}

// ----------------- GLOBALS -----------------
let isDryMode = false;

// ----------------- ENSURE USE TRANSLATIONS IS USED -----------------
function ensureI18nAccess(ast: t.File, namespace: string): boolean {
	const hookIdentifier = toSafeIdentifier(namespace);
	let didInject = false;

	traverse(ast, {
		// ---------- Function Components ----------
		FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
			if (!isReactComponentFunction(path)) return;

			const bodyPath = path.get('body');
			if (!bodyPath.isBlockStatement()) return;

			const usesTranslation = componentUsesTranslation(
				bodyPath,
				hookIdentifier
			);

			if (!usesTranslation) return;
			const isAsync = isAsyncComponent(path);

			injectI18nImport(ast, isAsync ? 'async' : 'sync');

			if (isAsync) {
				const hasGetTranslations = componentHasGetTranslations(
					bodyPath,
					hookIdentifier,
					namespace
				);
				if (hasGetTranslations) return;

				bodyPath.unshiftContainer(
					'body',
					parseStatement(`
						const ${hookIdentifier} = await getTranslations("${namespace}");`)
				);
				didInject = true;
				return;
			}

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
			if (!isReactComponentFunction(path)) return;

			// ---- Block body ----
			if (path.node.body.type === 'BlockStatement') {
				const bodyPath = path.get('body') as NodePath<t.BlockStatement>;

				const usesTranslation = componentUsesTranslation(
					bodyPath,
					hookIdentifier
				);
				if (!usesTranslation) return;
				const isAsync = isAsyncComponent(path);

				injectI18nImport(ast, isAsync ? 'async' : 'sync');

				if (isAsync) {
					const hasGetTranslations = componentHasGetTranslations(
						bodyPath,
						hookIdentifier,
						namespace
					);
					if (hasGetTranslations) return;

					bodyPath.unshiftContainer(
						'body',
						parseStatement(
							`const ${hookIdentifier} = await getTranslations("${namespace}");`
						)
					);
					didInject = true;
					return;
				}

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

	ensureI18nAccess(ast, fileFolderKey);

	const { code: output } = generate(ast, { jsescOption: { minimal: true } });
	return output;
}

// ----------------- SCAN THROUGH PROJECT -----------------
async function scanDirectory(dir: string): Promise<ApplyResult> {
	const config = configContext.get();

	const localResult: ApplyResult = {
		scannedFiles: 0,
		modifiedFiles: 0,
		skippedFiles: 0,
		errors: 0,
	};

	for (const entry of fs.readdirSync(dir)) {
		if (config.ignoreDirs.includes(entry)) continue;

		const full = path.join(dir, entry);

		let stat;
		try {
			stat = await fs.promises.stat(full);
		} catch {
			localResult.errors++;
			continue;
		}

		if (stat.isDirectory()) {
			const child = await scanDirectory(full);
			localResult.scannedFiles += child.scannedFiles;
			localResult.modifiedFiles += child.modifiedFiles;
			localResult.skippedFiles += child.skippedFiles;
			localResult.errors += child.errors;
			continue;
		}

		const ext = path.extname(entry);
		if (!config.validExtensions.includes(ext)) continue;

		localResult.scannedFiles++;

		const newCode = replaceStaticText(full);
		if (!newCode) {
			localResult.skippedFiles++;
			continue;
		}

		localResult.modifiedFiles++;

		if (isDryMode) continue;

		try {
			fs.writeFileSync(full, newCode, 'utf-8');
		} catch {
			localResult.errors++;
		}
	}

	return localResult;
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

	const result = await scanDirectory(nextintlConfig.projectRootDir);

	if (result.errors > 0) {
		console.error(chalk.red(`❌ Completed with ${result.errors} error(s).`));
		return;
	}

	if (result.modifiedFiles === 0) {
		console.log(chalk.yellow('⚠️ No translatable content detected.'));
		return;
	}

	console.log(
		chalk.green(
			`✅ Completed successfully. ${result.modifiedFiles} file(s) updated.`
		)
	);

	deleteGeneratedMessagesFile();
}

if (import.meta.url === `file://${process.argv[1]}`) {
	initApplyTranslations({ dry: false });
}
