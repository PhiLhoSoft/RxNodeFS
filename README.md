# RxNodeFS v. 1.0.0

Library to wrap Node.js' FS library (filesystem) in RxJS' Observables.
Currently only wrap directory reading (with optional recursion) and file reading.
The data is provided as a stream of file information, as it consumes less memory:
we can select and keep the useful information and throw away the remainder.

The [RxNodeFS](https://PhiLhoSoft.GitHub.io/) library exported as [Node.js](https://nodejs.org/) module.

## Installation

Using npm:
```bash
$ npm i --save rx-node-fs
```
(dummy: not on NPM yet)

## Usage

You can compile and run the test code and examples.

```bash
$ npm run build:test
$ node test-dist/test/rx-node-fs.spec.js > test-dist/TestData.txt
```


## History

v. 1.0 - Use TypeScript
v. 0.3 - Use ES6, RxJS 6, add TS typings
v. 0.2 - Add CheckLocalConsistency
v. 0.1 - Initial implementation

## TODO

Describe how it works...

Meanwhile, see the JSDoc of the library, it is quite detailed.

Also see the test file test/rx-node-fs.spec.ts, and the example examples/CheckLocaleConsistency/check-consistency.ts: this one is actually the primary reason this library exists, as I didn't want to cumulate callbacks on successive file readings...
