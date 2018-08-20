#!/usr/bin/env node


'use strict';


/* dependencies */
const path = require('path');
require('@lykmapipo/env');
const { getCounts } = require(path.join(__dirname, '..', 'lib', 'db'));


/* count available accounts */
getCounts(function (error, counts) {

  //ensure account numbers
  if (error) {
    console.log(error);
    throw error;
  }

  console.log(counts);

});
