'use strict';


/* dependencies */
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const knex = require('knex');
const through = require('through');
const env = require('@lykmapipo/env');
const { toE164 } = require('@codetanzania/majifix-common').phone;
const { getString, getNumber, getStrings } = env;


/* constants */
const MSSQL_HOST = getString('MSSQL_HOST');
const MSSQL_DATABASE_NAME = getString('MSSQL_DATABASE_NAME');
const MSSQL_USER = getString('MSSQL_USER');
const MSSQL_PASSWORD = getString('MSSQL_PASSWORD');
const DEFAULT_LIMIT = getNumber('DEFAULT_LIMIT');
const DEFAULT_OFFSET = getNumber('DEFAULT_OFFSET');
const DEFAULT_JURISDICTION = getString('DEFAULT_JURISDICTION');
const DEFAULT_CUSTOMER_CATEGORY = getString('DEFAULT_CUSTOMER_CATEGORY');
const DEFAULT_LOCALE = getString('DEFAULT_LOCALE');
const DEFAULT_SAMPLING_BILL_PERIODS = getNumber('DEFAULT_SAMPLING_BILL_PERIODS');
const DEFAULT_BILL_PERIODS = getNumber('DEFAULT_BILL_PERIODS');
const DEFAULT_BILL_CURRENCY = getString('DEFAULT_BILL_CURRENCY');
const DEFAULT_BILL_NOTES = getString('DEFAULT_BILL_NOTES');
const DEFAULT_BILL_PAY_PERIOD = getNumber('DEFAULT_BILL_PAY_PERIOD');
const DEFAULT_BILL_DATE_FORMAT = getStrings('DEFAULT_BILL_DATE_FORMAT');
const DEFAULT_USER_DATE_FORMAT = getStrings('DEFAULT_USER_DATE_FORMAT');
const DEFAULT_BILL_MONTH_FORMAT = getString('DEFAULT_BILL_MONTH_FORMAT');
const ACCOUNT_TABLE_NAME = '[dbo].[CUST_DTL]';
const CUSTOMER_TABLE_NAME = '[dbo].[customerpaymentsdetails]';
const USER_TABLE_NAME = '[dbo].[users]';
// const READINGS_TABLE_NAME = '[dbo].[discrepancyreportsnew]';
const BILL_HISTORY_TABLE_NAME = '[dbo].[spotbillsimportedstatement]';


/* defaults */
const DEFAULT_ACCOUNT = {
  jurisdiction: DEFAULT_JURISDICTION,
  category: DEFAULT_CUSTOMER_CATEGORY,
  number: '',
  name: '',
  phone: '',
  email: '',
  neighborhood: '',
  address: '',
  locale: DEFAULT_LOCALE,
  active: true
};
const DEFAULT_BILL = {
  number: '',
  notes: DEFAULT_BILL_NOTES,
  currency: DEFAULT_BILL_CURRENCY,
  period: {},
  balance: { debt: 0 },
  items: []
};
const DEFAULT_USER = {
  name: '',
  phone: '',
  email: ''
};


/* initializing database connection */
const instance = exports.knex  = knex({
  client: 'mssql',
  connection: {
    host: MSSQL_HOST,
    user: MSSQL_USER,
    password: MSSQL_PASSWORD,
    database: MSSQL_DATABASE_NAME
  }
});


/* helpers */

/**
 * @name toDate
 * @function  toDate
 * @description Convert date string to strings
 * @return {Date} valid date object
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.toDate = function (value, formats) {

  //map value using date formats
  let dates = _.map([].concat(formats), function (format) {
    return moment(value, format);
  });

  //filter valid dates
  dates = _.filter(dates, function (date) { return date.isValid(); });

  //obtain valid date
  dates = dates && dates.length > 0 ? dates[0] : undefined;

  return dates.toDate();
};


/**
 * @name normalizeAccount
 * @function  normalizeAccount
 * @description Normalize customer account details
 * @param {Object} account valid customer account details
 * @return {Object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.normalizeAccount = function normalizeAccount(account) {

  //ensure account
  account = _.merge({}, DEFAULT_ACCOUNT, account);

  //force account number to uppercase
  account.number = _.toUpper(account.number);

  //map phone to E164
  account.phone = toE164(account.phone);

  //ensure locations
  const hasLocation =
    (
      (account.longitude && account.latitude) &&
      (!_.isNaN(account.longitude) && !_.isNaN(account.latitude))
    );
  if (hasLocation) {
    account.location = {
      type: 'Point',
      coordinates: [Number(account.longitude), Number(account.latitude)]
    };
    delete account.longitude;
    delete account.latitude;
  }

  return account;

};


/**
 * @name normalizeAccount
 * @function  normalizeAccount
 * @description Normalize customer bill history
 * @param {Object} account valid customer bill history
 * @return {Object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.normalizeBillHistory = function normalizeBillHistory(bills) {
  /* jshint camelcase:false */

  //ensure bills collection
  let _bills = _.compact([].concat(bills));

  //shape bills accordingly
  _bills = _.map(bills, function (bill) {

    let _bill = _.merge({}, DEFAULT_BILL);

    //prepare dates
    const billedAt =
      (bill.readingDate ? exports.toDate(bill.readingDate,
        DEFAULT_BILL_DATE_FORMAT) : undefined);
    const duedAt = (
      billedAt ?
      moment(billedAt).add(DEFAULT_BILL_PAY_PERIOD, 'days').toDate() :
      undefined
    );

    //prepare bill items

    //prepare previous reading
    const previousReadings = {
      name: 'Previous Readings', //SW
      quantity: Number(bill.previousReading || 0),
      unit: 'cbm',
    };

    //prepare current readings
    const currentReadings = {
      name: 'Current Readings',
      quantity: Number(bill.currentReading || 0),
      unit: 'cbm',
      time: bill.readingDate ? exports.toDate(bill.readingDate,
        DEFAULT_BILL_DATE_FORMAT) : undefined
    };

    //prepare consumption
    const consumed = {
      name: 'Water Charge',
      quantity: Number(bill.consumption || 0),
      unit: 'cbm',
      price: Number(bill.currentCharges || 0),
      items: _.compact([previousReadings, currentReadings])
    };

    //TODO service charges
    const items = _.compact([
      consumed
    ]);

    //pack bill
    _bill = _.merge({}, _bill, {
      number: bill.number,
      notes: bill.notes,
      currency: DEFAULT_BILL_CURRENCY,
      period: {
        name: moment(billedAt).format(DEFAULT_BILL_MONTH_FORMAT),
        billedAt: billedAt,
        startedAt: undefined,
        endedAt: billedAt,
        duedAt: duedAt, //7days from billed date
      },
      balance: {
        outstand: Number(bill.outstandBalance || 0), // last month close balance + current charges
        open: Number(bill.openBalance || 0), // last month close balance
        close: Number(bill.closeBalance || 0), // equal to outstand at begin but after payment start not
        charges: Number(bill.currentCharges || 0), //bill.total_charges ? bill.total_charges : 0, //current charges
        debt: 0 // connection loan balance
      },
      items: items
    });

    return _bill;

    /* jshint camelcase:true */

  });

  //ensure sort order is desc by billed date
  _bills = _.orderBy(_bills, 'balance.billedAt', 'desc');

  //ensure periods start dates
  _.forEach(_.range(_bills.length), function (period) {
    if (period < DEFAULT_BILL_PERIODS) {
      _bills[period].period.startedAt =
        _bills[period + 1] ? (_bills[period + 1].period || {}).billedAt :
        undefined;
    }
  });

  //take required bill periods
  _bills = _.take(_bills, DEFAULT_BILL_PERIODS);

  return _bills;

};


/* queries */

/**
 * @name getUserDetails
 * @function  getUserDetails
 * @description Obtain users accessing account
 * @param {String} accountNumber valid customer account number
 * @param {Function} done a callback to invoke on success or error
 * @return {Object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.getUserDetails = function getUserDetails(accountNumber, done, txn) {

  const USER_DETAILS_QUERY =
    `SELECT
  LTRIM(RTRIM(u.accountno)) AS number,
  CONCAT(LTRIM(RTRIM(u.firstname)), ' ', LTRIM(RTRIM(u.sirname))) AS name,
  LTRIM(RTRIM(u.phoneno)) AS phone,
  LTRIM(RTRIM(u.email)) AS email,
  LTRIM(RTRIM(u.dater)) AS verifiedAt
  FROM ${USER_TABLE_NAME} AS u WHERE accountno = '${accountNumber}'`;

  (txn || instance).raw(USER_DETAILS_QUERY).asCallback(function (error, results) {
    if (!error && results) {
      results = _.compact([].concat(results));
      results = _.map(results, function (result) {
        result.verifiedAt =
          (result.verifiedAt ? exports.toDate(result.verifiedAt,
            DEFAULT_USER_DATE_FORMAT) : undefined);
        result.phone = toE164(result.phone);
        return _.merge({}, DEFAULT_USER, result);
      });
    }
    done(error, results);
  });

};


/**
 * @name getAccountDetails
 * @function  getAccountDetails
 * @description Obtain customer account details
 * @param {String} accountNumber valid customer account number
 * @param {Function} done a callback to invoke on success or error
 * @return {Object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.getAccountDetails = function getAccountDetails(accountNumber, done, txn) {

  const ACCOUNT_DETAILS_QUERY =
    `SELECT
  LTRIM(RTRIM(a.CUSTKEY)) AS number,
  CONCAT(LTRIM(RTRIM(a.INITIAL)), ' ', LTRIM(RTRIM(a.SURNAME))) AS name,
  LTRIM(RTRIM(a.CELL_TEL_NO)) AS phone,
  LTRIM(RTRIM(a.UA_ADRESS1)) AS plot,
  LTRIM(RTRIM(a.UA_ADDRESS3)) AS neighborhood,
  LTRIM(RTRIM(a.UA_ADDRESS4)) AS city
  FROM ${ACCOUNT_TABLE_NAME} AS a WHERE CUSTKEY = '${accountNumber}'`;

  (txn || instance).raw(ACCOUNT_DETAILS_QUERY).asCallback(function (error, results) {
    if (!error && results) {
      results = _.merge({}, results[0]);
      results = exports.normalizeAccount(results);
    }
    done(error, results);
  });

};


/**
 * @name getCustomerDetails
 * @function  getCustomerDetails
 * @description Obtain customer details
 * @param {String} accountNumber valid customer account number
 * @param {Function} done a callback to invoke on success or error
 * @return {Object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.getCustomerDetails = function getCustomerDetails(accountNumber, done, txn) {

  const CUSTOMER_DETAILS_QUERY =
    `SELECT
  LTRIM(RTRIM(c.CUSTKEY)) AS number,
  LTRIM(RTRIM(c.SURNAME)) AS name,
  LTRIM(RTRIM(c.CELL_TEL_NO)) AS phone,
  LTRIM(RTRIM(c.UA_ADRESS1)) AS plot,
  LTRIM(RTRIM(c.UA_ADRESS3)) AS neighborhood,
  LTRIM(RTRIM(c.UA_ADRESS4)) AS city,
  LTRIM(RTRIM(c.X_GPS)) AS longitude,
  LTRIM(RTRIM(c.Y_GPS)) AS latitude
  FROM ${CUSTOMER_TABLE_NAME} AS c WHERE CUSTKEY = '${accountNumber}'`;

  (txn || instance).raw(CUSTOMER_DETAILS_QUERY).asCallback(function (error, results) {
    if (!error && results) {
      results = _.merge({}, results[0]);
      results = exports.normalizeAccount(results);
    }
    done(error, results);
  });

};


/**
 * @name getBillHistory
 * @function  getBillHistory
 * @description Obtain customer bill history
 * @param {String} accountNumber valid customer account number
 * @param {Function} done a callback to invoke on success or error
 * @return {Object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.getBillHistory = function getBillHistory(accountNumber, done, txn) {

  const BILL_HISTORY_QUERY =
    `SELECT TOP ${DEFAULT_SAMPLING_BILL_PERIODS}
    LTRIM(RTRIM(b.CUSTKEY)) AS accountNumber,
    LTRIM(RTRIM(b.SMS_STATUS)) AS number,
    b.OPENING_BALANCE AS openBalance,
    b.CURRENT_BALANCE AS closeBalance,
    b.CURRENT_BALANCE AS outstandBalance,
    b.CURRENT_CHARGES AS currentCharges,
    b.CR_READING AS currentReading,
    b.PR_READING AS previousReading,
    b.DATE_OF_READING AS readingDate,
    b.CONSUMPTION AS consumption,
    LTRIM(RTRIM(b.CELL_TEL_NO)) AS phone,
    LTRIM(RTRIM(b.CONSUMER_TYPE_DESC)) AS category
    FROM ${BILL_HISTORY_TABLE_NAME} AS b
    WHERE CUSTKEY='${accountNumber}'
    ORDER BY DATE_OF_READING DESC`;


  (txn || instance).raw(BILL_HISTORY_QUERY).asCallback(function (error, results) {
    if (!error && results) {
      results = [].concat(results);
      results = exports.normalizeBillHistory(results);
    }
    done(error, results);
  });

};


/**
 * @name getAccount
 * @function  getAccount
 * @description Obtain full customer account details
 * @param {String} accountNumber valid customer account number
 * @param {Function} done a callback to invoke on success or error
 * @return {Object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.getAccount = function getAccount(accountNumber, done, txn) {

  //launch queries
  async.parallel({

    account: function fetchAccountDetails(next) {
      exports.getAccountDetails(accountNumber, next, txn);
    },

    customer: function fetchCustomerDetails(next) {
      exports.getCustomerDetails(accountNumber, next, txn);
    },

    accessors: function fetchAccessorDetails(next) {
      exports.getUserDetails(accountNumber, next, txn);
    },

    bills: function fetchBillHistory(next) {
      exports.getBillHistory(accountNumber, next, gtxn);
    }

  }, function (error, results) {

    //process results
    if (!error) {

      //normalize results
      results =
        _.merge({}, { account: {}, customer: {}, bills: [], accessors: [] },
          results);

      //merge account results
      results.account = _.merge({}, results.customer, results.account);
      //set address
      const { plot, neighborhood, city } = results.account;
      results.account.address =
        _.compact([plot, neighborhood, city]).join(', ');

      //shape results
      results =
        _.merge({}, results.account, {
          accessors: results.accessors,
          bills: results.bills
        });

    }

    //continue
    done(error, results);

  });

};


/**
 * @name getAccountNumbers
 * @function  getAccountNumbers
 * @description Obtain account numbers
 * @param {Function} done a callback to invoke on success or error
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.getAccountNumbers =
  function getAccountNumbers(offset, limit, done) {

    const ACCOUNT_NUMBERS_QUERY =
      `SELECT
    DISTINCT CUSTKEY AS accountNumber
    FROM ${ACCOUNT_TABLE_NAME}
    ORDER BY CUSTKEY
    OFFSET ${offset} ROWS
    FETCH NEXT ${limit} ROWS ONLY`;

    instance.raw(ACCOUNT_NUMBERS_QUERY).asCallback(function (error, results) {
      if (!error && results) {
        results = _.compact([].concat(results));
      }
      done(error, results);
    });

  };


/**
 * @name getAccountNumbers
 * @function  getAccountNumbers
 * @description Obtain account numbers
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.getNumbers = function getNumbers(offset = 0, limit = 10) {

  const ACCOUNT_NUMBERS_QUERY =
    `SELECT
    DISTINCT CUSTKEY AS accountNumber
    FROM ${ACCOUNT_TABLE_NAME}
    ORDER BY CUSTKEY
    OFFSET ${offset} ROWS
    FETCH NEXT ${limit} ROWS ONLY`;

  return instance.raw(ACCOUNT_NUMBERS_QUERY).stream();

};


/**
 * @name getCounts
 * @function  getCounts
 * @description Obtain account count
 * @param {Function} done a callback to invoke on success or error
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.getCounts = function getCounts(done) {

  const ACCOUNT_NUMBERS_QUERY =
    `SELECT COUNT (DISTINCT CUSTKEY) AS count FROM ${ACCOUNT_TABLE_NAME}`;

  instance.raw(ACCOUNT_NUMBERS_QUERY).asCallback(function (error, results) {
    if (!error && results) {
      results = _.compact([].concat(results));
      results = _.merge({ count: 0 }, results[0]);
      results = results.count;
    }
    done(error, results);
  });

};
