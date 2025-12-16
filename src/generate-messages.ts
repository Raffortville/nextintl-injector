// import traverse from '@babel/traverse';
import { I18nInjectorConfig } from './config';
import { loadUserConfig } from './load-user-config';
import { setFileToAST } from './utils/ast';
// import { getGeneratedMessageOutputPathFile } from './utils/misc';
import fs from 'fs';
import path from 'path';
// import {
// 	extractTextFromJSXAttributeValue,
// 	extractTextFromJSXText,
// } from './utils/extractions';

// ----------------- GET CONFIG -----------------
let nextintlConfig: I18nInjectorConfig | null = null;
const initConfigUser = async () => {
	const configUser = await loadUserConfig();
	nextintlConfig = {
		...configUser,
	};
};
function getConfig(): I18nInjectorConfig {
	if (!nextintlConfig) {
		throw new Error('nextintl config file not loaded.');
	}
	return nextintlConfig;
}

// ----------------- EXTRACT TEXTS FROM AST -----------------
function extractTextsFromAST(filePath: string) {
	const config = getConfig();

	const ast = setFileToAST(filePath);
	if (!ast) {
		console.warn('❌ No AST generated for', filePath);
		return;
	}
	console.log('✅ AST generated for', filePath);

	// traverse(ast, {
	// 	JSXText(path) {
	// 		const text = extractTextFromJSXText(
	// 			path.node.value,
	// 			config.ignoreWords,
	// 			config.rulesToSkip || []
	// 		);
	// 		console.log('Extracted text:', text);
	// 	},
	// 	JSXAttribute(path) {
	// 		const attrValue = path.node.value;

	// 		if (!attrValue || attrValue.type !== 'StringLiteral') return;
	// 		const attrName = path.node.name.name;
	// 		if (typeof attrName !== 'string') return;
	// 		if (!config.jsxAttributes.includes(attrName)) return;

	// 		const text = extractTextFromJSXAttributeValue(
	// 			attrValue.value,
	// 			config.ignoreWords,
	// 			config.rulesToSkip || []
	// 		);
	// 		console.log('Extracted attribute text:', text);
	// 	},
	// });
	// Placeholder for AST extraction logic
}

// ----------------- SCAN THROUGH PROJECT -----------------
async function scanDirectory(dir: string) {
	const config = getConfig();

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
	if (!nextintlConfig) {
		await initConfigUser();
	}

	if (!nextintlConfig) {
		throw new Error('Configuration not loaded.');
	}

	await scanDirectory(nextintlConfig.projectRootDir);

	// const outputPath = getGeneratedMessageOutputPathFile(
	// 	nextintlConfig.defaultLocale
	// );

	console.log('🔍 Start generating messages');
}

if (import.meta.url === `file://${process.argv[1]}`) {
	initGenerateMessages();
}
