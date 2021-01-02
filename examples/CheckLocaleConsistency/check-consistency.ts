// Reads locale (i18n) files and ensure they have the same structure (same keys in same order),
// and all keys are used in code, and no keys used in code are missing in locale files.

import _ from 'lodash';

import { RxFsFile } from '../../lib/model.js';
import { readFiles } from '../../lib/rx-node-fs.js';
import { options } from './options.js';

// Suppose the test code is run from top-level of project
const LOCALES_DIR = './examples/CheckLocaleConsistency';

type AnyObject = Record<string, unknown>;

const sourceOptions =
{
	recurse: true,
	filterDirectory: (d: RxFsFile) => _.some(options.excludedDirectories, (f) => d.name !== f),
	filter: (f: RxFsFile) => f.name.endsWith('.html') || f.name.endsWith('.js'),
};

function listPaths(object: AnyObject)
{
	// For each key of the object,
	// push the key if its value is a string,
	// otherwise list the keys (simple and compound) of the value
	// and push each of these keys, prefixed by the current key.
	const result = _.reduce<AnyObject, string[]>(
		object,
		(r, value, key) =>
		{
			if (_.isObject(value))
			{
				const paths = listPaths(value as AnyObject);
				_.forEach(paths, (p) => { r.push(key + '.' + p); });
			}
			else
			{
				r.push(key);
			}
			return r;
		},
		[],
	);
	return result;
}

function readLocalizationFiles(done: (errorMessage: string | undefined, result?: Record<string, AnyObject>) => void)
{
	const jsonByFileName: Record<string, AnyObject> = {};
	const allFiles = _.clone(options.otherFiles);
	// Add the reference file
	allFiles.unshift(options.referenceFile);

	readFiles(LOCALES_DIR, { fileNames: allFiles, encoding: options.encoding }).subscribe(
		{
			next: (result: RxFsFile) =>
			{
				let localization: AnyObject;
				try
				{
					localization = JSON.parse(result.content!) as AnyObject;
				}
				catch (e)
				{
					return done(`While parsing Json for ${result.fullPath}:\n${e}`);
				}
				jsonByFileName[result.name] = localization;
			},
			error: (error: string) => { done(error); },
			complete: () => { done(undefined, jsonByFileName); },
		},
	);
}

// Run the code
readLocalizationFiles(
	(error: string | undefined, jsonByFileName: Record<string, AnyObject>) =>
	{
		if (error)
		{
			throw new Error('Error while reading localization files\n' + error);
		}

		const referenceList = listPaths(jsonByFileName[options.referenceFile]);
		const countByLocalizationKey = _.reduce<string[], Record<string, number>>(
			referenceList,
			(m, p: string) =>
			{
				m[p] = 0;
				return m;
			},
			{},
		);

		delete jsonByFileName[options.referenceFile];
		const otherLists = _.mapValues(jsonByFileName, listPaths);

		console.info('Reference file is', options.referenceFile);
		_.forEach(otherLists, (list, fileName) =>
		{
			if (!_.isEqual(list, referenceList))
			{
				console.info('Different list between', options.referenceFile, 'and', fileName);
				// Differences are empty if there are only moved keys (not in the same order). Arrays are still different.
				console.info('In ' + options.referenceFile + ', not in ' + fileName + '', _.difference(referenceList, list));
				console.info('In ' + fileName + ', not in ' + options.referenceFile + '', _.difference(list, referenceList));
			}
			else
			{
				console.info('OK for', fileName);
			}
		});

		// Process all source files
		const results: string[] = [];
		const errors: string[] = [];
		const files: string[] = [];
		readFiles(options.sourcePath, sourceOptions).subscribe(
			{
				next: (file: RxFsFile) =>
				{
					// Search in source files (JS and HTML) all localized strings
					if (!file.content)
					{
						errors.push('Empty ' + file.fullPath);
						return;
					}
					files.push(file.name);
					let matches = file.content.match(/["'>]([A-Z_]+(?:\.[A-Z0-9_]+)+)["'<]/g);
					if (matches === null)
					{
						// No localization there
						return;
					}
					matches = _.map(matches, (m) => m.replace(/["'<>]/g, ''));
					_.forEach(matches, (localeKey) =>
					{
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
						if (countByLocalizationKey[localeKey] === undefined)
						{
							errors.push('Unknown ' + localeKey + ' in ' + file.name);
						}
						else
						{
							countByLocalizationKey[localeKey]++;
						}
					});
				},
				error: (error: string) => { errors.push(error); },
				complete: () => { results.push('Check finished'); printResults(); },
			},
		);

		function printResults()
		{
			console.info('Errors\n', errors);
			// console.info('Results\n', countByLocalizationKey);
			const orphans = _.pickBy(countByLocalizationKey, (count) => count === 0);
			console.info('Orphans', orphans);
			// console.info('Using files\n', files);
		}
	},
);
