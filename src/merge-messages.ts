import { configContext } from './config.js';
import path from 'path';
import fs from 'fs';
import { I18nObject, validateI18n } from './utils/misc.js';
import chalk from 'chalk';
import { loadGeneratedMessages } from './load-generated-messages.js';

// ----------------- MERGE AND WRITE MESSAGES TO DEFAULT LOCALE FILE -----------------
function mergeAndWriteMessages(defaultMessagesFile: string) {
	const raw = fs.readFileSync(defaultMessagesFile, 'utf-8');
	const existingMessages = JSON.parse(raw);
	const validatedExistingMessages = validateI18n(existingMessages);

	if (!validatedExistingMessages) {
		console.error(`❌ Invalid i18n format in ${defaultMessagesFile}`);
		process.exit(1);
	}

	const generatedMessages = loadGeneratedMessages();

	const mergedMessages: I18nObject = {
		...validatedExistingMessages,
		...generatedMessages,
	};

	fs.writeFileSync(
		defaultMessagesFile,
		JSON.stringify(mergedMessages, null, 2),
		'utf-8'
	);
}

// ----------------- CREATE MESSAGE DIRECTORY AND DEFAULT LOCALE FILE IF MISSING -----------------
function createMessageDirectory() {
	const config = configContext.get();

	const messagesDirPath = path.join(
		config.projectRootDir,
		config.i18nMessagesFolderName ?? 'messages'
	);

	fs.mkdirSync(messagesDirPath, { recursive: true });

	const defaultMessageFilePath = path.join(
		messagesDirPath,
		`${config.defaultLocale}.json`
	);

	if (!fs.existsSync(defaultMessageFilePath)) {
		fs.writeFileSync(defaultMessageFilePath, '{}', 'utf-8');
		console.log('✅ Created default locale file:', defaultMessageFilePath);
	}
	mergeAndWriteMessages(defaultMessageFilePath);
}

// ----------------- GET EXISTING MESSAGES FROM i18nMessagesFolder -----------------
function getExistingMessages(dir: string) {
	const config = configContext.get();
	const defaultMessageFile = path.join(dir, `${config.defaultLocale}.json`);

	if (!fs.existsSync(defaultMessageFile)) {
		fs.writeFileSync(defaultMessageFile, '{}', 'utf-8');
		console.log('✅ Created default locale file:', defaultMessageFile);
	}
	mergeAndWriteMessages(defaultMessageFile);
}

// ----------------- SCAN THROUGH PROJECT -----------------
function scanDirectory(dir: string) {
	const config = configContext.get();
	const entries = fs.readdirSync(dir);
	let has18nMessagesFolder = false;

	for (const entry of entries) {
		if (config.ignoreDirs.includes(entry)) continue;

		const fullPath = path.join(dir, entry);
		const stats = fs.statSync(fullPath);

		if (!stats.isDirectory()) continue;

		if (entry === config.i18nMessagesFolderName) {
			getExistingMessages(fullPath);
			has18nMessagesFolder = true;
		} else {
			scanDirectory(fullPath); // recursion
		}
	}
	if (!has18nMessagesFolder) {
		createMessageDirectory();
	}
}

// ----------------- INIT MERGE MESSAGES -----------------
export async function initMergeMessages() {
	console.log('🔀 Start merging message directories...\n');

	await configContext.init();

	if (!configContext.isInitialized()) {
		throw new Error('Configuration not loaded.');
	}
	const nextintlConfig = configContext.get();

	scanDirectory(nextintlConfig.projectRootDir);

	console.log(
		chalk.green(
			`✅ Merged messages written to default locale files successfully.`
		)
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	initMergeMessages();
}
