import path from 'path';
import { RulesKey } from '../config.js';

const SCRIPT_ROOT_DIR = 'nextintl-injector';

const IS_DRY_RUN = false;
const RULES_TO_APPLY: RulesKey[] = [
	'short-uppercase',
	'numbers',
	'digits',
	'date-formats',
	'emails',
	'urls',
	'no-letters',
	'pure-symbols',
];

export { SCRIPT_ROOT_DIR, IS_DRY_RUN, RULES_TO_APPLY };
