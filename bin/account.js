#!/usr/bin/env node


'use strict';


/* dependencies */
const path = require('path');
const _ = require('lodash');
const async = require('async');
const minimist = require('minimist');
const mongoose = require('mongoose');
const env = require('@lykmapipo/env');
const { getNumber } = env;
const { Account } = require('@codetanzania/majifix-account');
const {
  getAccountNumbers,
  getAccount,
} = require(path.join(__dirname, '..', 'lib', 'db'));


/* constants */
const DEFAULT_OFFSET = getNumber('DEFAULT_OFFSET', 0);
const DEFAULT_LIMIT = getNumber('DEFAULT_LIMIT', 10);


/* read inputs */
const argv = minimist(process.argv.slice(2));
const offset = (argv.offset || DEFAULT_OFFSET);
const limit = (argv.limit || DEFAULT_LIMIT);


/* connect to mongodb database */
const MONGODB_URI = env('MONGODB_URI');
if (!MONGODB_URI) { throw new Error('Missing MONGODB_URI in process.env'); }
mongoose.connect(MONGODB_URI);

/* fetch accounts and their profile */
getAccountNumbers(offset, limit, function (error, accountNumbers) {

  //ensure account numbers
  if (error) {
    throw error;
  }

  //prepare accounts
  let _accountNumbers = [].concat(accountNumbers);
  _accountNumbers =
    _.compact(_.uniq(_.map(_accountNumbers, 'accountNumber')));
  let _getAccounts =
    _.map(_accountNumbers, function (accountNumber) {
      return function seedAccount(next) {
        getAccount(accountNumber, next);
      };
    });

  //migrate accounts in parallel
  async.parallel(_getAccounts, function (error, accounts) {
    if (error) {
      throw error;
    } else {
      console.log(accounts);
      console.log(_.map(accounts, 'number'));
    }
  });

});
