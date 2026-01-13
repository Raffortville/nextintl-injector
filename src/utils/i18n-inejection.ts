import * as t from '@babel/types';
import { parseStatement } from './misc.js';
import traverseModule, { type NodePath } from '@babel/traverse';

const traverse =
	(traverseModule as any).default ?? (traverseModule as typeof traverseModule);

function componentUsesTranslation(
	bodyPath: NodePath<t.BlockStatement | t.Expression>,
	hookIdentifier: string
): boolean {
	let usesTranslation = false;

	bodyPath.traverse({
		CallExpression(path) {
			if (t.isIdentifier(path.node.callee, { name: hookIdentifier })) {
				usesTranslation = true;
				path.stop();
			}
		},
	});

	return usesTranslation;
}

function componentHasUseTranslationsHook(
	bodyPath: NodePath<t.BlockStatement>,
	hookIdentifier: string,
	namespace: string
): boolean {
	let hasHook = false;

	bodyPath.traverse({
		VariableDeclarator(path) {
			if (
				t.isIdentifier(path.node.id, { name: hookIdentifier }) &&
				t.isCallExpression(path.node.init) &&
				t.isIdentifier(path.node.init.callee, { name: 'useTranslations' }) &&
				path.node.init.arguments.length === 1 &&
				t.isStringLiteral(path.node.init.arguments[0], { value: namespace })
			) {
				hasHook = true;
				path.stop();
			}
		},
	});

	return hasHook;
}

function injectI18nImport(ast: t.File): boolean {
	let hasImport = false;

	// Check existing imports
	traverse(ast, {
		ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
			if (
				path.node.source.value === 'next-intl' &&
				path.node.specifiers.some(
					(s) =>
						t.isImportSpecifier(s) &&
						t.isIdentifier(s.imported) &&
						s.imported.name === 'useTranslations'
				)
			) {
				hasImport = true;
			}
		},
	});

	if (!hasImport) {
		const importNode = parseStatement(
			`import { useTranslations } from 'next-intl';`
		);
		ast.program.body.unshift(importNode);
	}
	return hasImport;
}

export {
	componentUsesTranslation,
	componentHasUseTranslationsHook,
	injectI18nImport,
};
