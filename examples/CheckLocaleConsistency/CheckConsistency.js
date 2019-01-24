// Reads locale (i18n) files and ensure they have the same structure (same keys in same order),
// and all keys are used in code, and no keys used in code are missing in locale files.

/* global require, __dirname */// Appeases ESLint


const _ = require('lodash');
const rxfs = require('../../lib/RxNodeFS');

const options = require('./Options');

const sourceOptions =
{
	recurse: true,
	filterDirectory: (d) => _.some(options.excludedDirectories, (f) => d.name !== f ),
	filter: (f) => f.name.endsWith('.html') || f.name.endsWith('.js'),
};


function listPaths(object)
{
	// For each key of the object,
	// push the key if its value is a string,
	// otherwise list the keys (simple and compound) of the value
	// and push each of these keys, prefixed by the current key.
	const result = _.reduce(object, (r, value, key) =>
	{
		if (_.isObject(value))
		{
			const paths = listPaths(value);
			_.forEach(paths, (p) => { r.push(key + '.' + p); });
		}
		else
		{
			r.push(key);
		}
		return r;
	}, []);
	return result;
}

function readLocalizationFiles(done)
{
	const jsonByFileName = {};
	const allFiles = _.clone(options.otherFiles);
	// Add the reference file
	allFiles.unshift(options.referenceFile);

	rxfs.readFiles(__dirname, { fileNames: allFiles, encoding: options.encoding }).subscribe(
		(result) =>
		{
			let localization;
			try
			{
				localization = JSON.parse(result.content);
			}
			catch (e)
			{
				return done('While parsing Json for ' + result.fullPath + ':\n' + e);
			}
			jsonByFileName[result.name] = localization;
		},
		(err) => { done(err); },
		() => { done(undefined, jsonByFileName); }
	);
}

readLocalizationFiles((err, jsonByFileName) =>
{
	if (err)
	{
		throw new Error('Error while reading localization files\n' + err);
	}

	const referenceList = listPaths(jsonByFileName[options.referenceFile]);
	const countByLocalizationKey = _.reduce(referenceList, (m, p) =>
	{
		m[p] = 0;
		return m;
	}, {});

	delete jsonByFileName[options.referenceFile];
	const otherLists = _.mapValues(jsonByFileName, listPaths);

	console.log('Reference file is', options.referenceFile);
	_.forEach(otherLists, (list, fileName) =>
	{
		if (!_.isEqual(list, referenceList))
		{
			console.log('Different list between', options.referenceFile, 'and', fileName);
			// Differences are empty if there are only moved keys (not in the same order). Arrays are still different.
			console.log('In ' + options.referenceFile + ', not in ' + fileName + '', _.difference(referenceList, list));
			console.log('In ' + fileName + ', not in ' + options.referenceFile + '', _.difference(list, referenceList));
		}
		else
		{
			console.log('OK for', fileName);
		}
	});

	// Process all source files
	const results = [];
	const errors = [];
	const files = [];
	rxfs.readFiles(options.sourcePath, sourceOptions).subscribe(
		(file) =>
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
			matches = _.map(matches, (m) =>
			{
				return m.replace(/["'<>]/g, '');
			});
			_.forEach(matches, (localeKey) =>
			{
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
		(err) => { errors.push(err); },
		() => { results.push('Check finished'); printResults(); }
	);

	function printResults()
	{
		console.log('Errors\n', errors);
		// console.log('Results\n', countByLocalizationKey);
		const orphans = _.pickBy(countByLocalizationKey, (count) => count === 0);
		console.log('Orphans', orphans);
		// console.log('Using files\n', files);
	}
});
