// Tests RxNodeFS.

/* global require */// Appeases ESLint, can add  __dirname

// process.on('uncaughtException', function(err)
// {
// 	console.error(err.stack || err.message);
// });

var _ = require('lodash');
var rxfs = require('../lib/RxNodeFS.js');

var SAMPLE_DIR = 'sample';
var LIB_DIR = '..';
var testOptions =
{
	// Path SAMPLE_DIR
	flatFiltering: { filter: function (f, i) { return f.name.endsWith('.html'); } },
	selectedFiles: { fileNames: [ 'templateLeftPanelController.js', 'templateLeftPanelView.html' ] },
	flatPattern: { pattern: /^template\w+\.js$/ },
	recurse: { recurse: true },
	// Path LIB_DIR
	recurseWithStatFilter: { recurse: true, filter: function (f, i) { return f.stat.size > 2000; } },
	allJsonNoGitModules:
	{
		recurse: true,
		filterDirectory: function (d, i)
		{
			return d.name !== 'node_modules' && d.name !== '.git';
		},
		filter: function (f, i)
		{
			return f.name.endsWith('.json');
		},
	},
	noFolders: { onlyFiles: true },
	withStatFilter:
	{
		readStat: true,
		onlyFiles: true,
		// filter: function (f, i) { return f.stat.mtime.getMonth() < 3; } // Hard to reproduce
		filter: function (f, i) { return f.stat.size < 500; }
	},
	withStatAndList: { readStat: true, fileNames: [ 'package.json', 'README.md', 'dialog' ] },
	allJSNoLibs:
	{
		recurse: true,
		filterDirectory: function (d, i)
		{
			return d.name !== 'node_modules' && d.name !== '.git';
		},
		filter: function (f, i)
		{
			return f.name.endsWith('.js');
		},
	},
};

function run(optionName, observable)
{
	var array = [];
	function add(msg, obj) { array.push(msg + (obj ? ' ' + JSON.stringify(obj, null, 1) : '')); }
	function print() { _.forEach(array, function (item) { console.log(item.replace(/\\+/g, '/')); }); }
	observable.subscribe(
		function __onNext(file)
		{
			var f = _.cloneDeep(file);
			if (f.stat)
			{
				f.stat = 'Size: ' + f.stat.size +
				', modified: ' + f.stat.mtime.toISOString() +
				', is file: ' + f.stat.isFile();
			}
			add('Next', f);
		},
		function __onError(err) { add('Error', err); },
		function __onComplete() { add('Done for ' + optionName + '\n'); print(); }
	);
}

function testReadDir(optionList, path, changeOption)
{
	optionList.forEach(function (optionName)
	{
		var opt = _.clone(testOptions[optionName]);
		if (_.isFunction(changeOption))
		{
			opt = changeOption(opt);
		}
		run(optionName, rxfs.readDirectory(path, opt));
	});
}

testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern', ], SAMPLE_DIR);
testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern', ], SAMPLE_DIR,
	function __alterOptions(opt) { opt.asObject = true; return opt; });
testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern', ], SAMPLE_DIR,
	function __alterOptions(opt) { opt.readStat = true; return opt; });
testReadDir([ 'recurse', 'recurseWithStatFilter', ], SAMPLE_DIR);

testReadDir([ 'allJsonNoGitModules', ], LIB_DIR);
testReadDir([ 'noFolders', 'withStatFilter', 'withStatAndList', ], LIB_DIR);
testReadDir([ 'allJSNoLibs', ], LIB_DIR);

var a = [];
rxfs.readFiles(SAMPLE_DIR).subscribe(
	function __onNext(result) { a.push(result.name); a.push(result.content.substring(0, 100).replace(/\s+/g, 'µ')); },
	function __onError(err) { console.error(err); },
	function __onComplete() { console.log('Done sample read, flat', a); }
);
var b = [];
rxfs.readFiles(SAMPLE_DIR, { recurse: true }).subscribe(
	function __onNext(result) { b.push(result.name); b.push(result.content.substring(0, 100).replace(/\s+/g, 'µ')); },
	function __onError(err) { console.error(err); },
	function __onComplete() { console.log('Done sample read, recursive', b); }
);
