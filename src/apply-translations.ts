// ----------------- EXECUTION -----------------
export async function initApplyTranslations() {
	console.log('Applying translations...');
}

if (import.meta.url === `file://${process.argv[1]}`) {
	initApplyTranslations();
}
