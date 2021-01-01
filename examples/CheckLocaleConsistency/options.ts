// ==================================================
// Configuration of CheckLocaleConsistency: change settings here

export const options =
{
	encoding: 'utf8', // 'ascii' or 'utf8' in pure Node

	// This file is supposed to be the most up-to-date,
	// it is the one used to check usage in the code, and is the reference for comparisons.
	referenceFile: 'locale-en.json',

	otherFiles:
	[
		'locale-de.json',
		'locale-fr.json',
		// List other languages here
	],
	// I could list automatically all files, with glob to match and another to ignore.
	// Overkill, simpler to be explicit... Unless you have LOT of locales...

	// Path to the source files where we check all keys are used, and none are not defined...
	// Assumes the HTML templates are in the same path. Otherwise, might need some changes below.
	sourcePath: '../../',
	excludedDirectories: [ 'node_modules', '.git' ],
};
