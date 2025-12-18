import { initMergeMessages } from './merge-messages.js';

export interface ApplyOptions {
	dry: boolean;
}
let isDryMode = false;

// ----------------- EXECUTION -----------------
export async function initApplyTranslations(options: ApplyOptions) {
	isDryMode = options.dry;
	if (!isDryMode) {
		initMergeMessages();
	}
	console.log('Applying translations...', options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	initApplyTranslations({ dry: false });
}
