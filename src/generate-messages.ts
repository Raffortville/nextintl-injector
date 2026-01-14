import { configContext, I18nInjectorConfig } from './config.js';
import { setFileToAST } from './utils/ast.js';
import chalk from 'chalk';

import fs from 'fs';
import path from 'path';
import {
	extractTextFromJSXAttributeValue,
	extractTextFromJSXText,
	getLastFileAndFolder,
} from './utils/extractions.js';
import traverseModule, { type NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import {
	textKeyGenerator,
	validateI18n,
	getGeneratedMessageOutputPathFile,
} from './utils/misc.js';

const traverse =
	(traverseModule as any).default ?? (traverseModule as typeof traverseModule);

// ----------------- EXTRACTED TEXTS STORAGE -----------------
const generatedMessages: Record<string, Record<string, string>> = {};
const scan_extractions: Record<
	string,
	Record<string, { static_text: string; path: string }>
> = {};

// ----------------- REPORT EXTRACTED TEXTS -----------------
function setReportExtractedTexts(filePath: string, texts: Set<string>) {
	if (texts.size === 0) return;
	const config = configContext.get();

	const fileFolderKey = getLastFileAndFolder(filePath);
	const pathRelative = path.relative(config.projectRootDir, filePath);
	generatedMessages[fileFolderKey] = {};
	scan_extractions[fileFolderKey] = {};

	for (const text of texts) {
		const textKey = textKeyGenerator(text);
		scan_extractions[fileFolderKey][textKey] = {
			static_text: text,
			path: pathRelative,
		};
		generatedMessages[fileFolderKey][textKey] = text;
	}

	const validated = validateI18n(generatedMessages[fileFolderKey]);

	if (!validated) {
		console.warn('❌ Validation error for texts in', filePath);
		return; // pas de crash
	}
}

// ----------------- EXTRACT TEXTS FROM AST -----------------
function extractTextsFromAST(filePath: string) {
	const ast = setFileToAST(filePath);
	if (!ast) {
		console.warn('❌ No AST generated for', filePath);
		return;
	}
	const config = configContext.get();
	const fileTexts = new Set<string>();

	traverse(ast, {
		JSXText(path: NodePath<t.JSXText>) {
			const text = extractTextFromJSXText(
				path.node.value,
				config.ignoreWords,
				config.rulesToSkip || []
			);
			if (text) {
				fileTexts.add(text);
			}
		},
		JSXAttribute(path: NodePath<t.JSXAttribute>) {
			const attrValue = path.node.value;

			if (!attrValue || attrValue.type !== 'StringLiteral') return;
			const attrName = path.node.name.name;
			if (typeof attrName !== 'string') return;
			if (!config.jsxAttributes.includes(attrName)) return;

			const text = extractTextFromJSXAttributeValue(
				attrValue.value,
				config.ignoreWords,
				config.rulesToSkip || []
			);
			if (text) {
				fileTexts.add(text);
			}
		},
	});

	setReportExtractedTexts(filePath, fileTexts);
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

		extractTextsFromAST(full);
	}
}

// ----------------- EXECUTION -----------------
export async function initGenerateMessages() {
	await configContext.init();

	if (!configContext.isInitialized()) {
		throw new Error('Configuration not loaded.');
	}
	const nextintlConfig: I18nInjectorConfig = configContext.get();

	try {
		await scanDirectory(nextintlConfig.projectRootDir);

		const messagesOutputPath = getGeneratedMessageOutputPathFile(
			nextintlConfig.defaultLocale
		);

		fs.mkdirSync(path.dirname(messagesOutputPath), { recursive: true });

		const hasGenereatedMessages = Object.keys(generatedMessages).length > 0;
		if (!hasGenereatedMessages) {
			console.log(
				chalk.yellowBright(
					'No static texts were found for extraction in the project.'
				)
			);
			return;
		}

		fs.writeFileSync(
			messagesOutputPath,
			JSON.stringify(generatedMessages, null, 2),
			'utf-8'
		);

		const totalExtractions = Object.values(scan_extractions).reduce(
			(sum, group) => sum + Object.keys(group).length,
			0
		);

		console.log(
			`${chalk.greenBright('✔')} Total texts extracted:`,
			totalExtractions
		);

		console.log(
			'✅ Generated messages written to',
			`${chalk.underline.blueBright(messagesOutputPath)}`
		);
	} catch (error) {
		console.error('❌ Error during message generation:', error);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	initGenerateMessages();
}
