#!/usr/bin/env node

import { Command } from 'commander';
import { initGenerateMessages } from './generate-messages';

const program = new Command();

program
	.name('nextintl-injector')
	.description('A static text extractor and injector for Next.js + next-intl.')
	.version('0.1.0');

// ------------------------
// Messages command
// ------------------------
program
	.command('generate')
	.description('Generate internationalization messages.')
	.action(async () => {
		try {
			await initGenerateMessages();
		} catch (err) {
			console.error('❌ Failed to execute generate command:', err);
			process.exit(1);
		}
	});

// ------------------------
// Top-level error handling
// ------------------------
(async () => {
	try {
		await program.parseAsync(process.argv);
	} catch (err) {
		console.error('❌ CLI execution failed:', err);
		process.exit(1);
	}
})();

// ------------------------
// Optional: catch unhandled rejections
// ------------------------
process.on('unhandledRejection', (reason) => {
	console.error('❌ Unhandled rejection:', reason);
	process.exit(1);
});
