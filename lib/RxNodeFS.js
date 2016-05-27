// Using RxJS to handle Node.js' filesystem calls.
// Based on https://github.com/trxcllnt/rxjs-fs/blob/master/index.js

var _ = require('lodash');
var Rx = require('rx');
var fs = require('fs');
var nodePath = require('path');


function createFilter(options)
{
	var filter = _.identity;
	if (_.isArray(options.fileNames))
	{
		filter = function __matchFileList(file)
		{
			// Probably used only in flat more, match both dirs and files.
			var fileName = toBaseName(file);
			return _.some(options.fileNames, function __isThisFile(f) { return fileName === f; });
		};
	}
	else if (_.isRegExp(options.pattern))
	{
		// Pattern matching is limited to file names only (not folder names).
		filter = _.partial(filePreFilter, function __matchPattern(file)
		{
			return toBaseName(file).match(options.pattern) !== null;
		});
	}
	else if (_.isFunction(options.filter))
	{
		// To filter out folders, use options.onlyFiles or options.filterDirectory.
		filter = _.partial(filePreFilter, options.filter);
	}
	return filter;
}

function filePreFilter(filter, file)
{
	if (file.stat && file.stat.isDirectory())
		return true; // Let directories pass through

	return filter(file);
}

function toBaseName(file)
{
	var filePath = toPath(file);
	return nodePath.basename(filePath);
}

function toPath(file)
{
	var filePath = file;
	if (_.isString(file.fullPath))
	{
		filePath = file.fullPath;
	}
	return filePath;
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


/**
 * Reads a file at given path with the given encoding, returning an observable wrapping its content.
 *
 * @param (string|Object) file - path to the file to read, or an object with a 'fullPath' key.
 * @param (string|null) encoding - if null or string, use that. If undefined, defaults to 'utf8'.
 * @return an observable wrapping either the content of the file if 'file' is a path,
 *         or the 'file' object augmented with the content under the 'content' key.
 */
function readFile(file, encoding)
{
	if (encoding === undefined)
	{
		encoding = 'utf8';
	}
	var filePath = toPath(file);

	return Rx.Observable.create(
		function __createObservable(observer)
		{
			fs.readFile(filePath, encoding, function __onReadFile(err, fileContent)
			{
				if (err)
					return observer.onError(err);

				var result = processResult(file, fileContent, 'content');
				observer.onNext(result);
				observer.onCompleted();
			});
		}
	);
}

/**
 * Reads the state of a file at given path.
 *
 * @param (string|Object) file - path to the file to read, or an object with a 'fullPath' key.
 * @return an observable wrapping either the content of the file if 'file' is a path,
 *         or the 'file' object augmented with the stat information under the 'stat' key.
 */
function readStat(file)
{
	return Rx.Observable.create(
		function __createObservable(observer)
		{
			var filePath = toPath(file);
			fs.stat(filePath, function __onReadStat(err, stat)
			{
				if (err)
					return observer.onError(err);

				var result = processResult(file, stat, 'stat');
				observer.onNext(result);
				observer.onCompleted();
			});
		}
	);
}

/**
 * Reads a directory at given path.
 *
 * @param {Object} [options] - the options (only one of fileList, pattern or filter is used)
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
function readDirectory(path, options)
{
	options = options || {};
	if (options.onlyFiles)
	{
		options.readStat = true;
	}
	if (options.recurse)
	{
		options.readStat = true;
		return readDirectoryDeep(path, options);
	}

	return readDirectoryFlat(path, options);
}

/**
 * Reads the content (files and sub-directories, no recursion) of the directory at given path, with the given options.
 * See readDirectory's doc for details.
 */
function readDirectoryFlat(path, options)
{
	var filter = createFilter(options);
	return Rx.Observable.create(
		function __createObservable(observer)
		{
			fs.readdir(path, function __onReadDir(err, fileNames)
			{
				if (err)
					return observer.onError(err);

				var files = Rx.Observable.fromArray(fileNames)
					.map(function __toFileObject(fileName)
					{
						return { name: fileName, fullPath: nodePath.resolve(path, fileName) };
					});

				if (options.readStat)
				{
					options.asObject = true;
					files = files
						.flatMap(function __addStat(file)
						{
							return readStat(file);
						});
				}

				files
					.filter(filter)
					.subscribe(
						function __onNext(file)
						{
							if (options.onlyFiles && file.stat.isDirectory())
								return;
							observer.onNext(options.asObject ? file : file.fullPath);
						},
						function __onError(e) { observer.onError(e); },
						function __onCompleted() { observer.onCompleted(); }
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
		.expand(function __recurse(file)
		{
			if (file.stat.isDirectory())
			{
				var toExplore = true;
				if (_.isFunction(options.filterDirectory))
				{
					toExplore = options.filterDirectory(file);
				}
				if (toExplore)
				{
					return readDirectoryDeep(file.fullPath, options);
				}
			}
			return Rx.Observable.empty();
		})
		.filter(function __excludeDirectory(f) { return !f.stat.isDirectory(); });
}

/**
 * Reads the content of the list of files at given path, with given options.
 * @param {String} path - the root path
 * @param {Object} [options] - the options of readDirectory's options, plus:
 *   {string} [options.encoding] - encoding used to read the files. Defaults to 'utf8'.
 * @return an observable providing a stream of file objects, as described in readDirectory,
 *         and with their content (at key 'content').
 */
function readFiles(path, options)
{
	options = _.defaults({}, options, { onlyFiles: true });
	return readDirectory(path, options)
		.flatMap(function __flatten(file)
		{
			var fileDataObservable = readFile(file, options.encoding);
			return fileDataObservable;
		});
}

module.exports =
{
	readFile: readFile,
	readStat: readStat,
	readDirectory: readDirectory,
	readFiles: readFiles,
};
