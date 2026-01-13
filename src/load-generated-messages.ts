import chalk from 'chalk';
import { configContext } from './config.js';
import {
	getGeneratedMessageOutputPathFile,
	validateI18n,
} from './utils/misc.js';
import fs from 'fs';

// ----------------- LOAD GENERATED MESSAGES -----------------
function loadGeneratedMessages() {
	const config = configContext.get();
	const messagesOutputPath = getGeneratedMessageOutputPathFile(
		config.defaultLocale
	);
	if (!fs.existsSync(messagesOutputPath)) {
		console.error(
			'❌',
			chalk.red(`Generated messages file not found at ${messagesOutputPath}`)
		);
		console.error(
			chalk.yellow(
				'Please run the message generation script before applying translations.'
			)
		);
		process.exit(1);
	}
	const raw = fs.readFileSync(messagesOutputPath, 'utf-8');
	const existingMessages = JSON.parse(raw);
	const validatedExistingMessages = validateI18n(existingMessages);

	if (validatedExistingMessages === null) {
		console.error(`❌ Invalid i18n format in ${messagesOutputPath}`);
		process.exit(1);
	}
	return validatedExistingMessages;
}

// ----------------- DELETE GENERATED MESSAGES FILE -----------------
function deleteGeneratedMessagesFile() {
	const config = configContext.get();
	const messagesOutputPath = getGeneratedMessageOutputPathFile(
		config.defaultLocale
	);
	if (fs.existsSync(messagesOutputPath)) {
		fs.unlinkSync(messagesOutputPath);
		console.log(
			'🗑️',
			chalk.green(`Deleted generated messages file at ${messagesOutputPath}`)
		);
	}
}

export { loadGeneratedMessages, deleteGeneratedMessagesFile };
