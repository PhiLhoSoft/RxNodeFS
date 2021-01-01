import * as fs from 'fs';

// I use interface here because it represents a type that implements it (and can be more).
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface RxFsFile
{
	name: string;
	fullPath: string;
	content?: string;
	stat?: fs.Stats;
}

export type RxFsPath = string | RxFsFile;

export type FilePredicate = (file: RxFsFile, index?: number) => boolean;

/** Options for readDirectory and readFiles. */
export type RxFsReadOptions =
{
	/** Don't list directories in output. Implies `options.readStat`. */
	onlyFiles?: boolean;
	/** Reads sub-directories as well. Implies `options.readStat`. */
	recurse?: boolean;
	/** If true, reads the stat information from the entries.
	 * Implies `options.asObject`, implied if `options.recurse` or `options.onlyFiles` are true
	 * (we need to distinguish files from directories).
	 */
	readStat?: boolean;
	/** Returns a File object. Implied if `options.readStat`, `options.recurse` or `options.onlyFiles` are true */
	asObject?: boolean;
	/** The list of file names to read at given path. */
	fileNames?: readonly string[];
	/** The pattern that can be used to filter in the file names. */
	pattern?: RegExp;
	/** A function to filter out specific files:
	 * called with a `file` object (including `stat` if `options.readStat` is true)
	 * and `index`, it must return a truthy value to include the file.
	 */
	filter?: FilePredicate;
	/** A function to filter out directories when `options.recurse` is true:
	 * the function is called with a `file` object (with `stat`) over found directories, and an `index`,
	 * it must return a truthy value to include the directory, otherwise we don't list it and its content.
	 */
	filterDirectory?: FilePredicate;
	/** Encoding used to read the files. Defaults to 'utf8'. */
	encoding?: string;
};
