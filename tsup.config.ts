import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts', 'src/cli.ts'],
	format: ['esm'],
	clean: true,
	bundle: true,
	dts: true,
	splitting: false,
});
