# RxNodeFS v. 0.3.0

Library to wrap Node.js' FS library (filesystem) in RxJS' Observables.
Currently only wrap directory reading (with optional recursion) and file reading.

The [RxNodeFS](https://PhiLhoSoft.GitHub.io/) library exported as [Node.js](https://nodejs.org/) module.

## Installation

Using npm:
```bash
$ {sudo -H} npm i -g npm
$ npm i --save rx-node-fs
```
(dummy: not on NPM yet)

## History

v. 0.3 - Use ES6, RxJS 6, add TS typings
v. 0.2 - Add CheckLocalConsistency
v. 0.1 - Initial implementation

## TODO

Describe how it works...

Meanwhile, see the JSDoc of the library, it is quite detailed.

Also see the test file test/TestRxNodeFS, and the example examples/CheckLocaleConsistency/CheckConsistency: this one is actually the primary reason this library exists, as I didn't want to cumulate callbacks on successive file readings...
