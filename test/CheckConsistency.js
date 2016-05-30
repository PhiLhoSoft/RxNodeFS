// Reads locale (i18n) files and ensure they have the same structure (same keys in same order),
// and all keys are used in code, and no keys used in code are missing in locale files.

/* global require, __dirname */// Appeases ESLint

//==================================================
// Configuration area: change settings here

var encoding = 'utf8'; // 'ascii' or 'utf8' in pure Node

// This file is supposed to be the most up-to-date, it is the one used to check usage in the code, and the reference for comparisons.
var referenceFile = 'locale-en.json';

var otherFiles =
[
	'locale-de.json',
	// List other languages here
];
// I could list automatically all files, with glob to match and another to ignore. Overkill, simpler to be explicit... Unless you have LOT of locales...

// Path to the source files where we check all keys are used, and none are not defined...
// Assumes the HTML templates are in the same path. Otherwise, might need some changes below.
var sourcePath = '../../';

// End of configuration area: don't touch code below (unless you fix something!)
//==================================================


var _ = require('lodash');
// var fs = require('fs');
// var path = require('path');
var rxfs = require('./RxNodeFS.js');


var sourceOptions =
{
	recurse: true,
	filterDirectory: function(d, i)
	{
		return d.name !== 'libs';
	},
	filter: function(f, i)
	{
		return f.name.endsWith('.html') || f.name.endsWith('.js');
	},
};


function listPaths(object)
{
	// For each key of the object,
	// push the key if its value is a string,
	// otherwise list the keys (simple and compound) of the value
	// and push each of these keys, prefixed by the current key.
	var result = _.reduce(object, function __processEntry(r, value, key)
	{
		if (_.isObject(value))
		{
			var paths = listPaths(value);
			_.forEach(paths, function(p) { r.push(key + '.' + p); });
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
	var jsonByFileName = {};
	var allFiles = _.clone(otherFiles);
	allFiles.unshift(referenceFile);

	rxfs.readFiles(__dirname, { fileNames: allFiles, encoding: encoding }).subscribe(
		function __onNext(result)
		{
			try
			{
				var localization = JSON.parse(result.content);
			}
			catch (e)
			{
				return done('While parsing Json for ' + result.fullPath + ':\n' + e);
			}
			jsonByFileName[result.name] = localization;
		},
		function __onError(err) { done(err); },
		function __onComplete() { done(undefined, jsonByFileName); }
	);
}

readLocalizationFiles(function __readAllJsonFiles(err, jsonByFileName)
{
	if (err)
	{
		throw new Error('Error while reading localization files\n' + err);
	}

	var referenceList = listPaths(jsonByFileName[referenceFile]);
	var referenceMap = _.reduce(referenceList, function __asKey(m, p)
	{
		m[p] = 0;
		return m;
	}, {});

	delete jsonByFileName[referenceFile];
	var otherLists = _.mapValues(jsonByFileName, function __toList(json, fileName)
	{
		return listPaths(json);
	});

	console.log('Reference file is', referenceFile);
	_.forEach(otherLists, function __compare(list, fileName)
	{
		if (!_.isEqual(list, referenceList))
		{
			console.log('Different list between', referenceFile, 'and', fileName);
			console.log('In ' + referenceFile + ', not in ' + fileName + '', _.difference(referenceList, list));
			console.log('In ' + referenceFile + ', not in ' + fileName + '', _.difference(list, referenceList));
		}
		else
		{
			console.log('OK for', fileName);
		}
	});

	var results = [];
	var errors = [];
	var files = [];
	rxfs.readFiles(sourcePath, sourceOptions).subscribe(
		function __onNext(file)
		{
			// Search in source files (JS and HTML) all localized strings
			if (!file.content)
			{
				errors.push('Empty ' + file.fullPath);
				return;
			}
			files.push(file.name);
			var matches = file.content.match(/["'>]([A-Z_]+(?:\.[A-Z0-9_]+)+)["'<]/g);
			if (matches === null)
			{
				// No localization there
				return;
			}
			matches = _.map(matches, function __cleanUp(m)
			{
				return m.replace(/["'<>]/g, '');
			});
			_.forEach(matches, function __count(localeKey)
			{
				if (referenceMap[localeKey] === undefined)
				{
					errors.push('Unknown ' + localeKey + ' in ' + file.name);
				}
				else
				{
					referenceMap[localeKey]++;
				}
			});
		},
		function __onError(err) { errors.push(err); },
		function __onComplete() { results.push('Check finished'); printResults(); }
	);

	function printResults()
	{
		console.log('Errors\n', errors);
		// console.log('Results\n', referenceMap);
		var orphans = _.pickBy(referenceMap,
			function __ifZero(count, key)
			{
				return count === 0;
			});
		console.log('Orphans', orphans);
		// console.log('Using files\n', files);
	}
});
