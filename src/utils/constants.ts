import path from 'path';
import { RulesKey } from '../config.js';

const SCRIPT_ROOT_DIR = 'static-text-detector';
const REPORT_OUTPUT_PATH = path.join(
	SCRIPT_ROOT_DIR,
	'extractions',
	'scan_extractions.json'
);
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

export { SCRIPT_ROOT_DIR, REPORT_OUTPUT_PATH, IS_DRY_RUN, RULES_TO_APPLY };
