// Tests RxNodeFS.

/* global require */// Appeases ESLint, can add  __dirname

// process.on('uncaughtException', (err) =>
// {
// 	console.error(err.stack || err.message);
// });

const _ = require('lodash');
const rxfs = require('../lib/RxNodeFS');

const SAMPLE_DIR = 'sample';
const LIB_DIR = '..';
const testOptions =
{
	// Path SAMPLE_DIR
	flatFiltering: { filter: (f) => f.name.endsWith('.html') },
	selectedFiles: { fileNames: [ 'templateLeftPanelController.js', 'templateLeftPanelView.html' ] },
	flatPattern: { pattern: /^template\w+\.js$/ },
	recurse: { recurse: true },
	// Path LIB_DIR
	recurseWithStatFilter: { recurse: true, filter: (f) => f.stat.size > 2000 },
	allJsonNoGitModules:
	{
		recurse: true,
		filterDirectory: (d) => d.name !== 'node_modules' && d.name !== '.git',
		filter: (f) => f.name.endsWith('.json'),
	},
	noFolders: { onlyFiles: true },
	withStatFilter:
	{
		readStat: true,
		onlyFiles: true,
		// filter: (f) => f.stat.mtime.getMonth() < 3, // Hard to reproduce
		filter: (f) => f.stat.size < 500,
	},
	withStatAndList: { readStat: true, fileNames: [ 'package.json', 'README.md', 'dialog' ] },
	allJSNoLibs:
	{
		recurse: true,
		filterDirectory: (d) => d.name !== 'node_modules' && d.name !== '.git',
		filter: (f) => f.name.endsWith('.js'),
	},
};

function run(optionName, observable)
{
	const array = [];
	function add(msg, obj) { array.push(msg + (obj ? ' ' + JSON.stringify(obj, null, 1) : '')); }
	function print() { _.forEach(array, (item) => { console.log(item.replace(/\\+/g, '/')); }); }
	observable.subscribe(
		(file) =>
		{
			const f = _.cloneDeep(file);
			if (f.stat)
			{
				f.stat = 'Size: ' + f.stat.size +
					', modified: ' + f.stat.mtime.toISOString() +
					', is file: ' + f.stat.isFile();
			}
			add('Next', f);
		},
		(err) => { add('Error', err); },
		() => { add(`Done for ${optionName}\n`); print(); },
	);
}

function testReadDir(optionList, path, changeOption)
{
	optionList.forEach((optionName) =>
	{
		let opt = _.clone(testOptions[optionName]);
		if (_.isFunction(changeOption))
		{
			opt = changeOption(opt);
		}
		run(optionName, rxfs.readDirectory(path, opt));
	});
}

console.log('Running tests');

rxfs.readFile('./sample/README.md').subscribe(
	(r) => { console.log('Next:', r.substr(0, 50)); },
	(e) => { console.log('Error', e); },
	() => { console.log('Complete'); },
);

testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern', ], SAMPLE_DIR);
testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern', ], SAMPLE_DIR, (opt) => { opt.asObject = true; return opt; });
testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern', ], SAMPLE_DIR, (opt) => { opt.readStat = true; return opt; });
testReadDir([ 'recurse', 'recurseWithStatFilter', ], SAMPLE_DIR);

testReadDir([ 'allJsonNoGitModules', ], LIB_DIR);
testReadDir([ 'noFolders', 'withStatFilter', 'withStatAndList', ], LIB_DIR);
testReadDir([ 'allJSNoLibs', ], LIB_DIR);

const a = [];
rxfs.readFiles(SAMPLE_DIR).subscribe(
	(result) => { a.push(result.name); a.push(result.content.substring(0, 100).replace(/\s+/g, '·')); },
	(err) => { console.error(err); },
	() => { console.log('Done sample read, flat', a); },
);
const b = [];
rxfs.readFiles(SAMPLE_DIR, { recurse: true }).subscribe(
	(result) => { b.push(result.name); b.push(result.content.substring(0, 100).replace(/\s+/g, '·')); },
	(err) => { console.error(err); },
	() => { console.log('Done sample read, recursive', b); },
);
