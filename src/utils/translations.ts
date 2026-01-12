import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

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

export { componentUsesTranslation, componentHasUseTranslationsHook };
