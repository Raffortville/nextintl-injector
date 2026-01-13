import path from 'path';
import { pathToFileURL } from 'url';
import { I18nInjectorConfig } from './config.js';

export async function loadUserConfig(): Promise<I18nInjectorConfig> {
	const configPath = path.resolve(process.cwd(), 'nextintl-injector.config.ts');

	try {
		const mod = await import(pathToFileURL(configPath).href);

		if (!mod.default) {
			console.warn(
				'[nextintl-injector] nextintl-injector.config.ts found but missing default export.'
			);
			throw new Error('Missing default export');
		}

		return {
			...mod.default,
		};
	} catch (e) {
		console.warn('[nextintl-injector] No nextintl-injector.config.ts found.');
		throw e;
	}
}
