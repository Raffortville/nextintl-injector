import { defineConfig } from 'tsup';

export default defineConfig({
	entry: [
		'src/index.ts',
		'src/cli.ts',
		'src/generate-messages.ts',
		'src/load-user-config.ts',
		'src/config.ts',
		'src/utils/misc.ts',
		'src/utils/ast.ts',
		'src/utils/extractions.ts',
		'src/utils/constants.ts',
		'src/apply-translations.ts',
		'src/merge-messages.ts',
		'src/load-generated-messages.ts',
		'src/utils/translations.ts',
	],
	format: ['esm'],
	clean: true,
	bundle: false,
	dts: true,
	splitting: false,
});
