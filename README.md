# majifix-int-dawasco

[![Build Status](https://travis-ci.org/CodeTanzania/majifix-int-dawasco.svg?branch=master)](https://travis-ci.org/CodeTanzania/majifix-int-dawasco)
[![Dependencies Status](https://david-dm.org/CodeTanzania/majifix-int-dawasco.svg)](https://david-dm.org/CodeTanzania/majifix-int-dawasco)
[![Coverage Status](https://coveralls.io/repos/github/CodeTanzania/majifix-int-dawasco/badge.svg?branch=master)](https://coveralls.io/github/CodeTanzania/majifix-int-dawasco?branch=master)
[![GitHub License](https://img.shields.io/github/license/CodeTanzania/majifix-int-dawasco)](https://github.com/CodeTanzania/majifix-int-dawasco/blob/master/LICENSE) 

[![Commitizen Friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Code Style](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)
[![npm version](https://img.shields.io/npm/v/@CodeTanzania/majifix-int-dawasco)](https://www.npmjs.com/package/@CodeTanzania/majifix-int-dawasco)

MajiFix - DAWASA Integration helpers

## Requirements

- [NodeJS v12+](https://nodejs.org)
- [Npm v6+](https://www.npmjs.com/)

## Installation

```sh
npm install @codetanzania/majifix-int-dawasco --save
```

## Usage

```js
const { getBillStatements } = require('@codetanzania/majifix-int-dawasco');

getBillStatements({ accountNumber: '...' }, (error, bills) => { ... });
```

## Environment
```js
BILL_BASE_URL=https://127.0.0.1/v1/
```

## Testing

- Clone this repository

- Install all development dependencies

```sh
npm install
```

- Run example

```sh
npm run dev
```

- Then run test

```sh
npm test
```

## Contribute

It will be nice, if you open an issue first so that we can know what is going on, then, fork this repo and push in your ideas. Do not forget to add a bit of test(s) of what value you adding.

## Licence

The MIT License (MIT)

Copyright (c) CodeTanzania & Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
