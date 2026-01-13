import * as t from '@babel/types';
import { parseStatement } from './misc.js';
import traverseModule, { type NodePath } from '@babel/traverse';

const traverse =
	(traverseModule as any).default ?? (traverseModule as typeof traverseModule);

function isAsyncComponent(
	path: NodePath<t.FunctionDeclaration | t.ArrowFunctionExpression>
): boolean {
	return path.node.async === true;
}

function isReactComponentFunction(
	path: NodePath<t.FunctionDeclaration | t.ArrowFunctionExpression>
): boolean {
	// function Home() {}
	if (path.isFunctionDeclaration()) {
		const name = path.node.id?.name;
		return !!name && name[0] === name[0].toUpperCase();
	}

	const parent = path.parentPath;

	// const Home = () => {}
	if (parent.isVariableDeclarator() && t.isIdentifier(parent.node.id)) {
		return parent.node.id.name[0] === parent.node.id.name[0].toUpperCase();
	}

	// export default () => {}
	// export default async function () {}
	if (parent.isExportDefaultDeclaration()) {
		return true;
	}

	return false;
}

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

function componentHasGetTranslations(
	bodyPath: NodePath<t.BlockStatement>,
	hookIdentifier: string,
	namespace: string
): boolean {
	let hasGetter = false;

	bodyPath.traverse({
		VariableDeclarator(path) {
			const init = path.node.init;

			if (
				t.isIdentifier(path.node.id, { name: hookIdentifier }) &&
				t.isAwaitExpression(init) &&
				t.isCallExpression(init.argument) &&
				t.isIdentifier(init.argument.callee, {
					name: 'getTranslations',
				}) &&
				init.argument.arguments.length === 1 &&
				t.isStringLiteral(init.argument.arguments[0], { value: namespace })
			) {
				hasGetter = true;
				path.stop();
			}
		},
	});

	return hasGetter;
}
function injectI18nImport(ast: t.File, mode: 'sync' | 'async') {
	const source = mode === 'async' ? 'next-intl/server' : 'next-intl';
	const imported = mode === 'async' ? 'getTranslations' : 'useTranslations';

	let hasImport = false;

	traverse(ast, {
		ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
			if (
				path.node.source.value === source &&
				path.node.specifiers.some(
					(s) =>
						t.isImportSpecifier(s) &&
						t.isIdentifier(s.imported, { name: imported })
				)
			) {
				hasImport = true;
			}
		},
	});

	if (!hasImport) {
		ast.program.body.unshift(
			parseStatement(`import { ${imported} } from '${source}';`)
		);
	}
}

export {
	componentUsesTranslation,
	componentHasUseTranslationsHook,
	injectI18nImport,
	isReactComponentFunction,
	isAsyncComponent,
	componentHasGetTranslations,
};
