import { RulesKey } from '../config.js';
import { RULES_TO_APPLY } from './constants.js';
import { normalizeJSXText } from './misc.js';
import path from 'path';

export function getLastFileAndFolder(relativePath: string): string {
	const dir = path.dirname(relativePath); // "src/app"
	const file = path.basename(relativePath); // "page.tsx"
	const fileNoExt = file.replace(path.extname(file), ''); // "page"

	const lastFolder = path.basename(dir); // "app"

	return `${lastFolder}_${fileNoExt}`;
}

const RULES: Record<RulesKey, (raw: string) => boolean> = {
	// 🔤 Ignore short uppercase texts (OK, ID)
	'short-uppercase': (raw: string) => /^[A-Z]{1,3}$/.test(raw),
	// 🔢 Ignore numbers (integers or decimals)
	numbers: (raw: string) => /^\d+(\.\d+)?$/.test(raw),
	// 🔤 Ignore texts with any digits
	digits: (raw: string) => {
		const digits = (raw.match(/\d/g) || []).length;
		return digits / raw.length > 0;
	},
	// 📅 Ignore common date formats
	'date-formats': (raw: string) => {
		return /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(raw);
	},
	// Ignore email addresses
	emails: (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw),
	// Ignore URLs
	urls: (raw: string) => {
		return /^(https?:\/\/|www\.)[^\s]+$/.test(raw);
	},
	// 🔤 Ignore texts with less than half letters
	'no-letters': (raw: string) => {
		return !/[a-zA-Z]/.test(raw);
	},
	'pure-symbols': (raw: string) => /^[^\w\s]+$/.test(raw), // only symbols like , : * ? - / etc.
};

function isTextIgnorable(
	text: string,
	ignoreWords: string[] = [],
	rulesToSkip: string[]
): boolean {
	const raw = text.trim();
	if (!raw) return true;

	// ignore empty texts or single letter
	if (raw.length <= 1) return true;

	const upperRaw = raw.toUpperCase();
	// 🔤 Ignore custom words
	if (ignoreWords.some((word) => word.toUpperCase() === upperRaw)) return true;

	const filteredRulesToApply = RULES_TO_APPLY.filter(
		(rule) => !rulesToSkip.includes(rule)
	);

	// Apply rules — stop when one matches
	for (const ruleKey of filteredRulesToApply) {
		const ruleFn = RULES[ruleKey];
		if (ruleFn && ruleFn(raw)) return true;
	}

	return false;
}

export function extractTextFromJSXText(
	jsxText: string,
	ignoredWords: string[],
	rulesToSkip: string[]
): string | undefined {
	if (isTextIgnorable(jsxText, ignoredWords, rulesToSkip)) return; // apply filters
	const normalizedText = normalizeJSXText(jsxText);
	if (!normalizedText) return;
	return normalizedText;
}

export function extractTextFromJSXAttributeValue(
	text: string,
	ignoredWords: string[],
	rulesToSkip: string[]
): string | undefined {
	if (isTextIgnorable(text, ignoredWords, rulesToSkip)) return;

	const normalizedText = normalizeJSXText(text);
	if (!normalizedText) return;

	return normalizedText;
}
