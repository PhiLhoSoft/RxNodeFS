// Tests RxNodeFS.

/* eslint-disable @typescript-eslint/no-magic-numbers */

// Note: currenly not a real test, it outputs the results, you have to check them manually…

// process.on('uncaughtException', (error) =>
// {
// 	logError(error.stack || error.message);
// });

import _ from 'lodash';
import { BehaviorSubject, Observable } from 'rxjs/index.js';

import { RxFsFile, RxFsPath, RxFsReadOptions } from '../lib/model.js';
import { readDirectory, readFile, readFiles, writeFile } from '../lib/rx-node-fs.js';

// Suppose the test code is run from top-level of project. That's the case with package.json scripts.
const SAMPLE_DIR = './test/sample';
const LIB_DIR = '.';
const testOptions: Record<string, RxFsReadOptions> =
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

const tasks = new BehaviorSubject<number>(0);
const output: string[] = [];

console.info('# Running tests');

console.info('## Read sample README');
readFile(SAMPLE_DIR + '/README.md').subscribe(
	{
		next: (result: string) => { log('readFile next: (sample) ' + result.substr(0, 50)); },
		error: (error) => { logError(error); },
		complete: () => { log('readFile complete'); },
	},
);

testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern' ], SAMPLE_DIR);
testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern' ], SAMPLE_DIR, (opt: RxFsReadOptions) => { opt.asObject = true; return opt; });
testReadDir([ 'flatFiltering', 'selectedFiles', 'flatPattern' ], SAMPLE_DIR, (opt: RxFsReadOptions) => { opt.readStat = true; return opt; });
testReadDir([ 'recurse', 'recurseWithStatFilter' ], SAMPLE_DIR);

testReadDir([ 'allJsonNoGitModules' ], LIB_DIR);
testReadDir([ 'noFolders', 'withStatFilter', 'withStatAndList' ], LIB_DIR);
testReadDir([ 'allJsNoLibs' ], LIB_DIR);

const sdf: string[] = [];
console.info('## Read sample dir, flat');
readFiles(SAMPLE_DIR).subscribe(
	{
		next: (result) =>
		{
			sdf.push('File name: ' + result.name);
			sdf.push('Fragment: ' + result.content!.substring(0, 100).replace(/\s+/g, '·'));
		},
		error: (error) => { logError(error); },
		complete: () => { log('Done sample read, flat', sdf); countCompletedTask(); },
	},
);

const sdr: string[] = [];
console.info('## Read sample dir, recurse');
readFiles(SAMPLE_DIR, { recurse: true }).subscribe(
	{
		next: (result) =>
		{
			sdr.push('File name: ' + result.name);
			sdr.push('Fragment: ' + result.content!.substring(0, 100).replace(/\s+/g, '·'));
		},
		error: (error) => { logError(error); },
		complete: () => { log('Done sample read, recursive', sdr); countCompletedTask(); },
	},
);

tasks.subscribe(
	(count) =>
	{
		if (count === 18)
		{
			writeFile('test-dist/TestData.txt', output.join('\n')).subscribe(
				{
					error: (error) => { console.error('Error writing test results file', error); },
					complete: () => { console.info('Done writing results'); },
				},
			);
		}
	},
);

function runReadDir(optionName: string, options: RxFsReadOptions, observable: Observable<RxFsPath>)
{
	const result: string[] = [];
	function add(msg: string, object?: unknown) { result.push(msg + (object ? ' ' + JSON.stringify(object, null, 1) : '')); }
	// function print() { _.forEach(result, (item) => { log(item.replace(/\\+/g, '/')); }); }
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
		complete: () =>
		{
			countCompletedTask();
			log(`Done for ${optionName} (${listOptions(options)})`, result);
		},
	});
}

function testReadDir(optionList: string[], path: string, changeOptions?: (options: RxFsReadOptions) => RxFsReadOptions)
{
	console.info('### Read dir', optionList);
	optionList.forEach((optionName) =>
	{
		let options: RxFsReadOptions = _.clone(testOptions[optionName]);
		if (_.isFunction(changeOptions))
		{
			options = changeOptions(options);
		}
		runReadDir(optionName, options, readDirectory(path, options));
	});
}

function listOptions(options: RxFsReadOptions): string
{
	return Object.keys(options).reduce<string[]>(
		(array, key) =>
		{
			array.push(key);
			return array;
		},
		[],
	).join(', ');
}
function countCompletedTask()
{
	tasks.next(tasks.value + 1);
}

function log(message: string, array?: string[])
{
	output.push(message);
	if (array)
	{
		output.push(array.join('\n'));
	}
}
function logError(message: string)
{
	output.push('[Error] ', message, '\n');
}
