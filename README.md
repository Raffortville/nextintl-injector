# nextintl-injector

A static text extractor and injector for **Next.js + next-intl** projects.

`nextintl-injector` scans your JSX/TSX files, extracts static strings into locale messages, then replaces those strings with translation calls.

## Install

```bash
pnpm add -D nextintl-injector
# or
npm i -D nextintl-injector
# or
yarn add -D nextintl-injector
```

## Quick Start

1. Create a config file at your project root: `nextintl-injector.config.ts`
2. Generate extracted messages:
   ```bash
   npx nextintl-injector generate
   ```
3. Apply translations in source files:
   ```bash
   npx nextintl-injector apply
   ```

## CLI

### `generate`

Scans your project and writes extracted texts to the default locale JSON file.

```bash
npx nextintl-injector generate
```

### `apply`

Replaces static JSX text/attributes with translation calls and injects the needed next-intl imports/hooks.

```bash
npx nextintl-injector apply
```

Dry run mode (no file changes):

```bash
npx nextintl-injector apply --dry
```

## Configuration

Create `nextintl-injector.config.ts` at your project root:

```ts
import type { I18nInjectorConfig } from 'nextintl-injector';

const config: I18nInjectorConfig = {
	projectRootDir: process.cwd(),
	defaultLocale: 'en',
	i18nMessagesFolderName: 'messages',

	validExtensions: ['.tsx', '.jsx'],
	ignoreDirs: ['node_modules', '.next', 'dist'],
	ignoreWords: ['OK', 'ID'],
	jsxAttributes: ['title', 'placeholder', 'aria-label'],
	rulesToSkip: [],
};

export default config;
```

### `rulesToSkip` values

- `short-uppercase`
- `numbers`
- `digits`
- `date-formats`
- `emails`
- `urls`
- `no-letters`
- `pure-symbols`

## Example Flow

### Before

```tsx
export default function Page() {
	return (
		<div>
			<h1>Hello World</h1>
			<input placeholder='Your email' />
		</div>
	);
}
```

### After `apply`

```tsx
import { useTranslations } from 'next-intl';

export default function Page() {
	const t_page = useTranslations('page');
	return (
		<div>
			<h1>{t_page('hello_world')}</h1>
			<input placeholder={t_page('your_email')} />
		</div>
	);
}
```

## Notes

- `generate` must run before `apply`.
- The tool supports `.tsx`/`.jsx` (or whatever you configure in `validExtensions`).
- Extracted output is written to your configured default locale (example: `messages/en.json`).

## Development

```bash
pnpm build
pnpm dev
pnpm format
```

## License

ISC
