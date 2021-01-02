# RxNodeFS v. 1.1.0

Library to wrap Node.js' FS library (filesystem) in RxJS' Observables.
Currently only wrap directory reading (with optional recursion), file reading and writing.
The read data is provided as a stream of file information, as it consumes less memory:
we can select and keep the useful information and throw away the remainder.

## Installation

Using npm:
```bash
$ npm i --save rx-node-fs
```

## Usage

You can compile and run the test code and examples.

```bash
$ npm run build:test
$ node run start:test
$ npm run build:examples
$ node run start:examples
```

That creates JS files in `test-dist` folder, and result files as TestData.txt and ExampleData.txt in the same directory.<br>
Currently, the "tests" just exercice the exposed API in various ways, and export the data in the above files.<br>
The result needs to be manually checked.

## History

v. 1.1.0 - Add writeFile, improve tests, using it<br>
v. 1.0.2 - Fix NPM packaging 🙄<br>
v. 1.0.0 - Use TypeScript<br>
v. 0.3.0 - Use ES6, RxJS 6, add TS typings<br>
v. 0.2.0 - Add CheckLocalConsistency<br>
v. 0.1.0 - Initial implementation

## TODO

Describe how it works...

Meanwhile, see the JSDoc of the library, it is quite detailed.

Also see the test file `test/rx-node-fs-test.ts`, and the example `examples/CheckLocaleConsistency/check-consistency.ts`: the latter is actually the primary reason this library exists, as I didn't want to cumulate callbacks on successive file readings...
