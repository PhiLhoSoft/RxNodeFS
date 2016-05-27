// Tests RxNodeFS.
// Note: this is not a real test: there are no assertions here!
// One reason it that it is hard to do proper directory setup to do a test.
// Moreover, this was made in a different context, so the paths used here will just not work currently.
// To be updated later.

// process.on('uncaughtException', function(err)
// {
// 	console.error(err.stack || err.message);
// });

var _ = require('lodash');
var rxfs = require('./RxNodeFS.js');

var testOptions =
	{
		// Path '.'
		flatFiltering: { filter: function (f, i) { return f.name.endsWith('.js'); } },
		selectedFiles: { fileNames: [ 'locale-en.json', 'locale-de.json' ] },
		flatPattern: { pattern: /^Rx\w+\.js$/ },
		// Custom path
		recurse: { recurse: true },
		recurseWithStatFilter: { recurse: true, filter: function (f, i) { return f.stat.size > 4000; } },
		// Path '..'
		allTTFNoLibs:
		{
			recurse: true,
			filterDirectory: function (d, i)
			{
				return d.name !== 'libs';
			},
			filter: function (f, i)
			{
				return f.name.endsWith('.ttf');
			},
		},
		// Path '../..'
		noFolders: { onlyFiles: true },
		withStatFilter: { readStat: true,  onlyFiles: true, filter: function (f, i) { return f.stat.mtime.getMonth() < 3; } },
		withStatAndList: { readStat: true, fileNames: [ 'favicon.ico', 'app.html', 'assets' ] },
		allHtmlNoLibs:
		{
			recurse: true,
			filterDirectory: function (d, i)
			{
				return d.name !== 'libs';
			},
			filter: function (f, i)
			{
				return f.name.endsWith('.html');
			},
		},
	};

function run(optionName, observable)
{
	var array = [];
	function add(msg, obj) { array.push(msg + (obj ? ' ' + JSON.stringify(obj, null, 1) : '')); }
	function print() { _.forEach(array, function __print(item) { console.log(item.replace(/\\+/g, '/')); }); }
	observable.subscribe(
		function __onNext(file)
		{
			var f = _.cloneDeep(file);
			if (f.stat)
			{
				f.stat = 'Size: ' + f.stat.size + ', modified: ' + f.stat.mtime.toISOString() +
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

testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern', ], '.');
// testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern', ], '.', function(opt) { opt.asObject = true; return opt; });
// testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern', ], '.', function(opt) { opt.readStat = true; return opt; });
// testReadDir([ 'recurse', 'recurseWithStatFilter', ], '../../../webapp/app/model');
// testReadDir([ 'allTTFNoLibs', ], '..');
// testReadDir([ 'noFolders', 'withStatFilter', 'withStatAndList', ], '../..');
// testReadDir([ 'allHtmlNoLibs', ], '../..');

var a = [];
rxfs.readFiles('.').subscribe(
	function __onNext(result) { a.push(result.name); a.push(result.content.substring(0, 100).replace(/\s+/g, 'µ')); },
	function __onError(err) { console.error(err); },
	function __onComplete() { console.log('Done', a); }
);
