import path from 'path';
import { SCRIPT_ROOT_DIR } from './constants.js';
import { z } from 'zod';
import * as t from '@babel/types';
import parser from '@babel/parser';

function getGeneratedMessageOutputPathFile(locale: string): string {
	return path.join(SCRIPT_ROOT_DIR, `${locale}.json`);
}

function normalizeJSXText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

function textKeyGenerator(text: string): string {
	const trimmed = text.trim().toLowerCase();

	const clean = (str: string) =>
		str
			.normalize('NFKD') // Normalize accents
			.replace(/[\u0300-\u036f]/g, '') // Remove accent marks
			.replace(/\s+/g, '_') // Spaces → _
			.replace(/[^\w]/g, ''); // Strip all non-word chars

	// If short → fallback to simple clean
	if (trimmed.length <= 30) {
		return clean(trimmed);
	}

	// Split into words
	const words = trimmed.split(/\s+/);

	// Extract: first 3 words + last 2 words
	const first3 = words.slice(0, 3).join(' ');
	const last2 = words.slice(-2).join(' ');

	// Clean both segments
	const start = clean(first3);
	const end = clean(last2);

	return `${start}__${end}`;
}
export type I18nValue = string | I18nObject;
export interface I18nObject {
	[key: string]: I18nValue;
}

export const I18nSchema: z.ZodType<I18nObject> = z.lazy(() =>
	z.record(z.string(), z.union([z.string(), I18nSchema]))
);

function validateI18n(data: unknown): I18nObject | null {
	const result = I18nSchema.safeParse(data);
	return result.success ? result.data : null;
}

function toSafeIdentifier(namespace: string): string {
	return 't_' + namespace.replace(/[^a-zA-Z0-9]/g, '_');
}

function parseStatement(code: string): t.Statement {
	const ast = parser.parse(code, {
		sourceType: 'module',
		plugins: ['jsx', 'typescript'],
	});
	return ast.program.body[0];
}

export {
	getGeneratedMessageOutputPathFile,
	normalizeJSXText,
	toSafeIdentifier,
	parseStatement,
	textKeyGenerator,
	validateI18n,
};
