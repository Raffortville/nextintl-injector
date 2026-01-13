import { loadUserConfig } from './load-user-config.js';

export type RulesKey =
	| 'short-uppercase'
	| 'numbers'
	| 'digits'
	| 'date-formats'
	| 'emails'
	| 'urls'
	| 'no-letters'
	| 'pure-symbols';

export interface I18nInjectorConfig {
	projectRootDir: string; // Absolute path
	defaultLocale: string; // e.g., 'en'
	i18nMessagesFolderName?: string; // e.g., 'messages'

	validExtensions: string[]; // ['.jsx', '.tsx']
	ignoreDirs: string[]; // directories to skip
	ignoreWords: string[]; // text to ignore
	jsxAttributes: string[]; // attributes to check
	rulesToSkip: RulesKey[]; // rules that should not be applied
}

class ConfigContext {
	private config: I18nInjectorConfig | null = null;

	async init() {
		if (this.config) return;

		this.config = {
			...(await loadUserConfig()),
		};
	}

	get(): I18nInjectorConfig {
		if (!this.config) {
			throw new Error('nextintl-injector config file not loaded.');
		}
		return this.config;
	}

	isInitialized(): boolean {
		return this.config !== null;
	}
}

export const configContext = new ConfigContext();
