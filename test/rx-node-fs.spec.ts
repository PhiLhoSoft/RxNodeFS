// Tests RxNodeFS.

/* eslint-disable @typescript-eslint/no-magic-numbers */

// Note: currenly not a real test, it outputs the results, you have to check them manually…

// process.on('uncaughtException', (error) =>
// {
// 	console.error(error.stack || error.message);
// });

import _ from 'lodash';
import { Observable } from 'rxjs/index.js';

import { RxFsFile, RxFsPath, RxFsReadOptions } from '../lib/model.js';
import { readDirectory, readFile, readFiles } from '../lib/rx-node-fs.js';

// Suppose the test code is run from top-level of project
const SAMPLE_DIR = './test/sample';
const LIB_DIR = '.';
const testOptions =
{
	// Path SAMPLE_DIR
	flatFiltering: { filter: (f: RxFsFile) => f.name.endsWith('.html') },
	selectedFiles: { fileNames: [ 'templateLeftPanelController.js', 'templateLeftPanelView.html' ] },
	flatPattern: { pattern: /^template\w+\.js$/ },
	recurse: { recurse: true },
	// Path LIB_DIR
	recurseWithStatFilter: { recurse: true, filter: (f: RxFsFile) => f.stat!.size > 2000 },
	allJsonNoGitModules:
	{
		recurse: true,
		filterDirectory: (d: RxFsFile) => d.name !== 'node_modules' && d.name !== '.git',
		filter: (f: RxFsFile) => f.name.endsWith('.json'),
	},
	noFolders: { onlyFiles: true },
	withStatFilter:
	{
		readStat: true,
		onlyFiles: true,
		// filter: (f) => f.stat.mtime.getMonth() < 3, // Hard to reproduce
		filter: (f: RxFsFile) => f.stat!.size < 500,
	},
	withStatAndList: { readStat: true, fileNames: [ 'package.json', 'README.md', 'dialog' ] },
	allJsNoLibs:
	{
		recurse: true,
		filterDirectory: (d: RxFsFile) => d.name !== 'node_modules' && d.name !== '.git',
		filter: (f: RxFsFile) => f.name.endsWith('.js'),
	},
};

function run(optionName: string, observable: Observable<RxFsPath>)
{
	const array: string[] = [];
	function add(msg: string, object?: unknown) { array.push(msg + (object ? ' ' + JSON.stringify(object, null, 1) : '')); }
	function print() { _.forEach(array, (item) => { console.info(item.replace(/\\+/g, '/')); }); }
	observable.subscribe({
		next: (file: RxFsFile & { statInformation?: string }) =>
		{
			const f = _.cloneDeep(file);
			if (f.stat)
			{
				f.statInformation = `Size: ${f.stat.size}, modified: ${f.stat.mtime.toISOString()}, is file: ${f.stat.isFile()}`;
				delete f.stat;
			}
			add('Next', f);
		},
		error: (error) => { add('Error', error); },
		complete: () => { add(`Done for ${optionName}\n`); print(); },
	});
}

function testReadDir(optionList: string[], path: string, changeOptions?: (options: RxFsReadOptions) => RxFsReadOptions)
{
	console.info('### Read dir', optionList);
	optionList.forEach((optionName) =>
	{
		let options: RxFsReadOptions = _.clone(testOptions[optionName as never]);
		if (_.isFunction(changeOptions))
		{
			options = changeOptions(options);
		}
		run(optionName, readDirectory(path, options));
	});
}

console.info('# Running tests');

console.info('## Read sample README');
readFile(SAMPLE_DIR + '/README.md').subscribe(
	{
		next: (r: string) => { console.info('Next:', r.substr(0, 50)); },
		error: (e) => { console.info('Error', e); },
		complete: () => { console.info('Complete'); },
	},
);

testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern' ], SAMPLE_DIR);
testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern' ], SAMPLE_DIR, (opt: RxFsReadOptions) => { opt.asObject = true; return opt; });
testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern' ], SAMPLE_DIR, (opt: RxFsReadOptions) => { opt.readStat = true; return opt; });
testReadDir([ 'recurse', 'recurseWithStatFilter' ], SAMPLE_DIR);

testReadDir([ 'allJsonNoGitModules' ], LIB_DIR);
testReadDir([ 'noFolders', 'withStatFilter', 'withStatAndList' ], LIB_DIR);
testReadDir([ 'allJsNoLibs' ], LIB_DIR);

const a: string[] = [];
console.info('## Read sample dir, flat');
readFiles(SAMPLE_DIR).subscribe(
	{
		next: (result) => { a.push(result.name); a.push(result.content!.substring(0, 100).replace(/\s+/g, '·')); },
		error: (error) => { console.error(error); },
		complete: () => { console.info('Done sample read, flat', a); },
	},
);

const b: string[] = [];
console.info('## Read sample dir, recurse');
readFiles(SAMPLE_DIR, { recurse: true }).subscribe(
	{
		next: (result: RxFsFile) => { b.push(result.name); b.push(result.content!.substring(0, 100).replace(/\s+/g, '·')); },
		error: (error) => { console.error(error); },
		complete: () => { console.info('Done sample read, recursive', b); },
	},
);
