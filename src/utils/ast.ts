import fs from 'fs';
import parser from '@babel/parser';
import type { File } from '@babel/types';

/**
 * Parse a file into an AST (Abstract Syntax Tree)
 * @param filePath Absolute path to the file
 * @returns AST or undefined if parsing fails
 */
function setFileToAST(filePath: string): parser.ParseResult<File> | undefined {
	const content = fs.readFileSync(filePath, 'utf8');

	let ast;
	try {
		ast = parser.parse(content, {
			sourceType: 'module',
			plugins: ['jsx', 'typescript'], // support JSX + TypeScript
		});
	} catch {
		console.error('❌ Parse error in', filePath);
		return;
	}
	return ast;
}

export { setFileToAST };
