// Using RxJS to handle Node.js' filesystem calls.
// Loosely based on https://github.com/trxcllnt/rxjs-fs/blob/master/index.js
// Code from my own RxNodeFS, converted to TS.
// Someday, I will reinject this code there, and add this project as dependency.

import * as fs from 'fs';
import _ from 'lodash';
import * as nodePath from 'path';
import { EMPTY, from, Observable, Subscriber } from 'rxjs';
import { expand, filter, map, mergeMap } from 'rxjs/operators';

import { FilePredicate, RxFsFile, RxFsPath, RxFsReadOptions } from './model';

/**
 * Reads a file at given path with the given encoding, returning an observable wrapping its content.
 *
 * @param file - path to the file to read, or an object with a 'fullPath' key.
 * @param encoding - if null or string, use that. If undefined, defaults to 'utf8'.
 * @return an observable wrapping either the content of the file if 'file' is a path (string),
 *         or the 'file' object (RxFsFile) augmented with the content under the 'content' key.
 */
function readFile(file: string, encoding?: BufferEncoding): Observable<string>;
function readFile(file: RxFsFile, encoding?: BufferEncoding): Observable<RxFsFile>;
function readFile(file: RxFsPath, encoding?: BufferEncoding): Observable<string | RxFsFile>
{
	const filePath = toPath(file);
	if (encoding === undefined) // If null, keep it as is
	{
		encoding = 'utf8';
	}

	return new Observable(
		(observer: Subscriber<string | RxFsFile>) =>
		{
			fs.readFile(filePath, encoding!,
				(error: NodeJS.ErrnoException | null, fileContentOrBuffer: string | Buffer) =>
				{
					if (error)
					{
						observer.error(error);
						return;
					}

					const fileContent: string = _.isString(fileContentOrBuffer) ? fileContentOrBuffer : fileContentOrBuffer.toString();
					const result = processResult<string>(file, fileContent, 'content');
					observer.next(result);
					observer.complete();
				},
			);
		},
	);
}

/**
 * Writes a file at given path with the given data, returning an empty observable when done.
 *
 * @param file - path to the file to write, or an object with a 'fullPath' key.
 * @param data - the string to write at the given path (or a `Buffer`).
 * @param options - the writing options (see [fs.writeFile](https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback)).
 * @return an empty observable.
 */
export function writeFile(file: RxFsPath, data: string | Buffer, options: fs.WriteFileOptions | null = null): Observable<void>
{
	const filePath = toPath(file);
	return new Observable(
		(observer: Subscriber<void>) =>
		{
			fs.writeFile(filePath, data, options,
				(error: NodeJS.ErrnoException | null) =>
				{
					if (error)
					{
						observer.error(error);
						return;
					}

					observer.next(undefined);
					observer.complete();
				},
			);
		},
	);
}

/**
 * Reads the state of a file at given path.
 *
 * @param file - path to the file to read, or an object with a 'fullPath' key.
 * @return an observable wrapping either the stat information of the file if 'file' is a path,
 *         or the 'file' object augmented with the stat information under the 'stat' key.
 */
function readStat(file: string): Observable<fs.Stats>;
function readStat(file: RxFsFile): Observable<RxFsFile>;
function readStat(file: RxFsPath): Observable<fs.Stats | RxFsFile>
{
	return new Observable(
		(observer: Subscriber<RxFsFile | fs.Stats>) =>
		{
			const filePath = toPath(file);
			fs.stat(filePath, (error: NodeJS.ErrnoException | null, stat: fs.Stats) =>
			{
				if (error)
				{
					observer.error(error);
					return;
				}

				const result = processResult(file, stat, 'stat');
				observer.next(result);
				observer.complete();
			});
		},
	);
}

/**
 * Reads a directory at given path.
 *
 * @param path - the path of the directory
 * @param [options] - the options (only one of fileNames, pattern or filter is used)
 * @return an observable wrapping a stream of:
 * - full paths by default
 * - if `options.asObject` is true, objects with the full path at key `fullPath`, the file name at key `name`
 * - if `options.readStat` is true, the above objects plus the `Stat` object at key `stat`.
 */
export function readDirectory(path: string, options: RxFsReadOptions = {}): Observable<string | RxFsFile>
{
	if (options.onlyFiles || options.recurse)
	{
		options.readStat = true;
	}

	if (options.recurse)
	{
		return readDirectoryDeep(path, options);
	}

	return readDirectoryFlat(path, options);
}

/**
 * Reads the content of the files at given path, with given options.
 *
 * @param path - the root path
 * @param [options] - the options
 * @return an observable providing a stream of file objects, as described in `readDirectory`,
 *         and with their content (at key `content`).
 */
export function readFiles(path: string, options: RxFsReadOptions = {}): Observable<RxFsFile>
{
	if (!options.recurse)
	{
		options.onlyFiles = true; // Flat read, skip folders
	}

	return (readDirectory(path, options) as Observable<RxFsFile>)
		.pipe(
			mergeMap((file) => readFile(file, options.encoding)),
		);
}

// ----- Private functions -----

/**
 * Reads the content (files and sub-directories, no recursion) of the directory at given path, with the given options.
 * See readDirectory's doc for details.
 */
function readDirectoryFlat(path: string, options: RxFsReadOptions): Observable<string | RxFsFile>
{
	const fileFilter = createFilter(options);
	return new Observable(
		(observer: Subscriber<RxFsFile | string>) =>
		{
			fs.readdir(path, (error: NodeJS.ErrnoException | null, fileNames: readonly string[]) =>
			{
				if (error)
				{
					observer.error(error);
					return;
				}

				let files$: Observable<RxFsFile> = from(fileNames)
					.pipe(
						map((fileName) => ({ name: fileName, fullPath: nodePath.resolve(path, fileName) })),
					);

				if (options.readStat || options.onlyFiles)
				{
					options.asObject = true;
					files$ = files$.pipe(mergeMap(readStat));
				}

				files$
					.pipe(
						filter(fileFilter),
					)
					.subscribe({
						next: (file) =>
						{
							if (options.onlyFiles && file.stat!.isDirectory()) { return; }
							observer.next(options.asObject ? file : file.fullPath);
						},
						error: (error) => observer.error(error),
						complete: () => observer.complete(),
					});
			});
		},
	);
}

/**
 * Reads recursively the directory at given path, with the given options.
 * See readDirectory's doc for details. options.readStat is set to true, because it is necessary for recursion.
 */
function readDirectoryDeep(path: string, options: RxFsReadOptions): Observable<RxFsFile>
{
	options.readStat = true;
	// We force the type, as readStat is true, therefore we are sure to get a File.
	return (readDirectoryFlat(path, options) as Observable<RxFsFile>)
		.pipe(
			expand((file: RxFsFile) =>
			{
				if (file.stat!.isDirectory())
				{
					let toExplore = true;
					if (_.isFunction(options.filterDirectory))
					{
						toExplore = options.filterDirectory(file);
					}
					if (toExplore)
					{
						return readDirectoryDeep(file.fullPath, options);
					}
				}
				return EMPTY;
			}),
			filter((file: RxFsFile) => !file.stat!.isDirectory()),
		);
}

function createFilter(options: RxFsReadOptions): FilePredicate
{
	let filter: FilePredicate = () => true; // No filter
	if (_.isArray(options.fileNames))
	{
		filter = (file: RxFsFile) =>
		{
			// Probably used only in flat mode, match both dirs and files.
			const fileName = toBaseName(file);
			return _.some(options.fileNames, (f) => fileName === f);
		};
	}
	else if (_.isRegExp(options.pattern))
	{
		// Pattern matching is limited to file names only (not folder names).
		filter = (file: RxFsFile) => filePreFilter(file, (f) => options.pattern!.exec(toBaseName(f)) !== null);
	}
	else if (_.isFunction(options.filter))
	{
		// To filter out folders, use options.onlyFiles or options.filterDirectory.
		filter = (file: RxFsFile) => filePreFilter(file, options.filter!);
	}
	return filter;
}

function filePreFilter(file: RxFsFile, filter: FilePredicate): boolean
{
	if (file.stat?.isDirectory())
	{
		return true; // Let directories pass through
	}
	return filter(file);
}

function toBaseName(file: RxFsPath): string
{
	const filePath = toPath(file);
	return nodePath.basename(filePath);
}

function toPath(file: RxFsPath): string
{
	return _.isString(file) ? file : file.fullPath;
}

/**
 * Given a file (string path or object), a value (the result, any type) and a key of the object, if any:
 * if the file is just a path, it just returns the value itself.
 * Otherwise, if it is an object, adds the value to the object under the given key and returns that.
 */
function processResult<T>(file: RxFsPath, value: T, key: keyof RxFsFile): T | RxFsFile
{
	if (_.isString(file))
	{
		return value;
	}

	file[key] = value as never; // string or fs.Stats, likely
	return file;
}

export { readFile, readStat };
