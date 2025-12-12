#!/usr/bin/env node

import { Command } from 'commander';
import { apply, messages } from './messages';

const program = new Command();

program
	.name('nextintl-injector')
	.description('A static text extractor and injector for Next.js + next-intl.')
	.version('0.1.0');

program
	.command('messages')
	.description('Affiche un message de bienvenue')
	.action(() => {
		messages();
	});

program
	.command('apply')
	.description('Affiche un message de bienvenue')
	.action(() => {
		apply();
	});

program.parse();
