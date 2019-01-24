// Using RxJS to handle Node.js' filesystem calls.
// Loosely based on https://github.com/trxcllnt/rxjs-fs/blob/master/index.js

const fs = require('fs');
const nodePath = require('path');
const _ = require('lodash');
// Needs Node 8+
const { Observable, from, empty } = require('rxjs');
const { flatMap, map, filter, expand, catchError } = require('rxjs/operators');


/**
 * Reads a file at given path with the given encoding, returning an observable wrapping its content.
 *
 * @param (string|Object) file - path to the file to read, or an object with a 'fullPath' key.
 * @param (string|null|undefined) encoding - if null or string, use that. If undefined, defaults to 'utf8'.
 * @return an observable wrapping either the content of the file if 'file' is a path,
 *         or the 'file' object augmented with the content under the 'content' key.
 */
function readFile(file, encoding)
{
	const filePath = toPath(file);
	if (encoding === undefined) encoding = 'utf8';

	return Observable.create(
		(observer) =>
		{
			fs.readFile(filePath, encoding, (err, fileContent) =>
			{
				if (err)
					return observer.error(err);

				const result = processResult(file, fileContent, 'content');
				observer.next(result);
				observer.complete();
			});
		}
	);
}

/**
 * Reads the state of a file at given path.
 *
 * @param (string|Object) file - path to the file to read, or an object with a 'fullPath' key.
 * @return an observable wrapping either the stat information of the file if 'file' is a path,
 *         or the 'file' object augmented with the stat information under the 'stat' key.
 */
function readStat(file)
{
	return Observable.create(
		(observer) =>
		{
			const filePath = toPath(file);
			fs.stat(filePath, (err, stat) =>
			{
				if (err)
					return observer.error(err);

				const result = processResult(file, stat, 'stat');
				observer.next(result);
				observer.complete();
			});
		}
	);
}

/**
 * Reads a directory at given path.
 *
 * @param {string} path - the path of the directory
 * @param {Object} [options] - the options (only one of fileNames, pattern or filter is used)
 *   {boolean} [options.recurse] - reads sub-directories as well.
 *   {boolean} [options.asObject] - see return values.
 *   {boolean} [options.readStat] - if true, reads the stat information from the entries.
 *             Implies options.asObject, implied if options.recurse is true
 *             (we need to distinguish files from directories).
 *   {boolean} [options.onlyFiles] - don't list directories in output. Implies options.readStat.
 *   {Array} [options.fileNames] - the list of file names to read at given path.
 *   {RegEx} [options.pattern] - the pattern that can be used to filter in the file names.
 *   {Function} [options.filter] - a function to filter specific files:
 *              called with file object(including stat if options.readStat is true)
 *              and index, it must return a truthy value to include the file.
 *   {Function} [options.filterDirectory] - a function to filter directories when options.recurse is true:
 *              the function is called with the file object (with stat) over found directories, and an index,
 *              it must return a truthy value to include the directory, otherwise we don't list it and its content.
 *
 * @return an observable wrapping a stream of:
 * - full paths by default
 * - if options.asObject is true, objects with the full path at key 'fullPath', the file name at key 'name'
 * - if options.readStat is true, the above objects plus the Stat object at key 'stat'.
 */
function readDirectory(path, options = {})
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
 * Reads the content of the list of files at given path, with given options.
 *
 * @param {String} path - the root path
 * @param {Object} [options] - the options of readDirectory's options, plus:
 *   {string} [options.encoding] - encoding used to read the files. Defaults to 'utf8'.
 * @return an observable providing a stream of file objects, as described in readDirectory,
 *         and with their content (at key 'content').
 */
function readFiles(path, options = {})
{
	if (!options.recurse)
	{
		options.onlyFiles = true; // Flat read, skip folders
	}

	return readDirectory(path, options)
		.pipe(
			flatMap((file) => readFile(file, options.encoding)),
		);
}


//----- Private functions -----

/**
 * Reads the content (files and sub-directories, no recursion) of the directory at given path, with the given options.
 * See readDirectory's doc for details.
 */
function readDirectoryFlat(path, options)
{
	const fileFilter = createFilter(options);
	return Observable.create(
		(observer) =>
		{
			fs.readdir(path, (err, fileNames) =>
			{
				if (err)
					return observer.error(err);

				let files = from(fileNames)
					.pipe(
						map((fileName) => ({ name: fileName, fullPath: nodePath.resolve(path, fileName) })),
					);

				if (options.readStat)
				{
					options.asObject = true;
					files = files.pipe(flatMap(readStat));
				}

				files
					.pipe(
						filter(fileFilter),
					)
					.subscribe(
						(file) =>
						{
							if (options.onlyFiles && file.stat.isDirectory())
								return;
							observer.next(options.asObject ? file : file.fullPath);
						},
						(err) => observer.error(err),
						() => observer.complete(),
					);
			});
		}
	);
}

/**
 * Reads recursively the directory at given path, with the given options.
 * See readDirectory's doc for details. options.readStat is set to true, because it is necessary for recursion.
 */
function readDirectoryDeep(path, options)
{
	return readDirectoryFlat(path, options)
		.pipe(
			expand((file) =>
			{
				if (file.stat.isDirectory())
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
				return empty();
			}),
			filter((f) => !f.stat.isDirectory()),
		);
}

function createFilter(options)
{
	let filter = _.identity;
	if (_.isArray(options.fileNames))
	{
		filter = (file) =>
		{
			// Probably used only in flat mode, match both dirs and files.
			const fileName = toBaseName(file);
			return _.some(options.fileNames, (f) => fileName === f );
		};
	}
	else if (_.isRegExp(options.pattern))
	{
		// Pattern matching is limited to file names only (not folder names).
		filter = (file) => filePreFilter(file, (f) => toBaseName(f).match(options.pattern) !== null);
	}
	else if (_.isFunction(options.filter))
	{
		// To filter out folders, use options.onlyFiles or options.filterDirectory.
		filter = (file) => filePreFilter(file, options.filter);
	}
	return filter;
}

function filePreFilter(file, filter)
{
	if (file.stat && file.stat.isDirectory())
		return true; // Let directories pass through

	return filter(file);
}

function toBaseName(file)
{
	const filePath = toPath(file);
	return nodePath.basename(filePath);
}

function toPath(file)
{
	return _.isString(file.fullPath) ? file.fullPath : file;
}

/**
 * Given a file (string path or object), a value (the result) and a key:
 * if the file is just a path, return the value itself.
 * Otherwise, if it is an object, adds the value to the object under the given key and returns that.
 */
function processResult(file, value, key)
{
	if (_.isString(file))
		return value;

	file[key] = value;
	return file;
}


module.exports =
{
	readFile,
	readStat,
	readDirectory,
	readFiles,
};
