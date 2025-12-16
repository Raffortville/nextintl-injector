import path from 'path';
import { SCRIPT_ROOT_DIR } from './constants';

function getGeneratedMessageOutputPathFile(locale: string): string {
	return path.join(SCRIPT_ROOT_DIR, 'generated-messages', `${locale}.json`);
}

function normalizeJSXText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

export { getGeneratedMessageOutputPathFile, normalizeJSXText };
