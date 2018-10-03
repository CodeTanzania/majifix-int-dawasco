'use strict';


/* dependencies */
const path = require('path');
const db = require(path.join(__dirname, 'lib', 'db'));

db.getBillHistory('A8668801', function(error, bills) {
    console.log(error);
    console.log(bills);
});

/* exports */
exports = module.exports = db;
