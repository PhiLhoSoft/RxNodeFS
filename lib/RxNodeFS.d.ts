// Type definitions for RxNodeFS 0.3

type WithFullPath = { fullPath: string };
type WithStat = { stat: Stats };
type WithContent = { content: string };
type Stats = any; // Not sure how to refer to @types/node's Stats?
type File = WithFullPath &
{
	name: string; // File name
	stat?: Stats; // Stats of the file, if required
	content?: string; // Content of the file, if asked
}

type Options =
{
	recurse?: boolean; // Reads sub-directories as well
	asObject?: boolean; //
	readStat?: boolean; // If true, reads the stat information from the entries. Implies options.asObject, implied if options.recurse is true.
	onlyFiles?: boolean; // If true, doesn't list directories in output. Implies options.readStat.
	fileNames?: string[]; // The list of file names to read at given path
	pattern?: RegExp; // The pattern that can be used to filter in the file names
	filter?: (file: string | Object, index?: number) => boolean; // A function to filter specific files
	filterDirectory?: (file: string | Object, index?: number) => boolean; // A function to filter directories when options.recurse is true
	encoding?: string | null;
}

declare function readFile(file: string, encoding?: string | null): Observable<string>;
declare function readFile<T extends WithFullPath>(file: T, encoding?: string | null): Observable<T & WithContent>;
declare function readStat(file: string): Observable<Stats>;
declare function readStat<T extends WithFullPath>(file: T): Observable<T & WithStat>;
declare function readDirectory(path: string, options?: Options): Observable<string | File>;
declare function readFiles(path: string, options?: Options): Observable<File>;
