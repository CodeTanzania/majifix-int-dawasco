'use strict';


/* dependencies */
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const knex = require('knex');
const env = require('@lykmapipo/env');
const {
  phone
} = require('@codetanzania/majifix-common');
const {
  toE164
} = phone;
const {
  getString,
  getNumber,
  getStrings
} = env;


/* constants */
const MSSQL_HOST = getString('MSSQL_HOST');
const MSSQL_DATABASE_NAME = getString('MSSQL_DATABASE_NAME');
const MSSQL_USER = getString('MSSQL_USER');
const MSSQL_PASSWORD = getString('MSSQL_PASSWORD');
const DEFAULT_LIMIT = getNumber('DEFAULT_LIMIT');
const DEFAULT_OFFSET = getNumber('DEFAULT_OFFSET');
const DEFAULT_JURISDICTION = getString('DEFAULT_JURISDICTION');
const DEFAULT_CUSTOMER_CATEGORY = getString('DEFAULT_CUSTOMER_CATEGORY');
const DEFAULT_PHONE_NUMBER = getString('DEFAULT_PHONE_NUMBER');
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
const CURRENT_BILL_TABLE_NAME = '[dbo].[spotbillsimported]';
const PREVIOUS_BILL_TABLE_NAME = '[dbo].[spotbillsimportedprevious]';
const BILL_HISTORY_TABLE_NAME = '[dbo].[spotbillsimportedstatement]';
const DEFAULT_JURISDICTION_CODES =
  _.map(getStrings('DEFAULT_JURISDICTION_CODES'), function (code) {
    if (!_.isEmpty(code)) {
      code = code.split(':');
      code = {
        code: _.first(code),
        name: _.last(code)
      };
    }
    return code;
  });


/* defaults */
const DEFAULT_ACCOUNT = {
  jurisdiction: DEFAULT_JURISDICTION,
  category: DEFAULT_CUSTOMER_CATEGORY,
  number: '',
  name: '',
  phone: DEFAULT_PHONE_NUMBER,
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
  balance: {
    debt: 0
  },
  items: []
};
const DEFAULT_USER = {
  name: '',
  phone: '',
  email: ''
};


/* initializing database connection */
const instance = exports.knex = knex({
  client: 'mssql',
  connection: {
    host: MSSQL_HOST,
    user: MSSQL_USER,
    password: MSSQL_PASSWORD,
    database: MSSQL_DATABASE_NAME
  },
  pool: {
    min: 10,
    max: 20
  }
});


/* helpers */

/**
 * @name toDate
 * @function toDate
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
  dates = _.filter(dates, function (date) {
    return date.isValid();
  });

  //obtain valid date
  dates = dates && dates.length > 0 ? dates[0] : undefined;

  return dates.toDate();
};


/**
 * @name normalizeAccount
 * @function normalizeAccount
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
  const _account = _.merge({}, DEFAULT_ACCOUNT, account);

  //normalize jurisdiction
  let {
    jurisdiction
  } = account;
  if (!_.isEmpty(jurisdiction)) {
    jurisdiction =
      (_.find(DEFAULT_JURISDICTION_CODES, {
        code: jurisdiction
      }) || {}).name;
  }
  _account.jurisdiction = jurisdiction;

  //force account number to uppercase
  _account.number = _.toUpper(account.number);
  _account.identity = _.toUpper(account._identity);

  //map phone to E164
  _account.phone =
    (_.isEmpty(account.phone) ? DEFAULT_PHONE_NUMBER : account.phone);
  _account.phone = toE164(account.phone);

  //set address
  const {
    plot,
    house,
    neighborhood,
    city
  } = account;
  _account.address = _.compact([
    plot, house, neighborhood,
    jurisdiction, city
  ]).join(', ');

  //ensure locations
  const hasLocation =
    (
      (account.longitude && account.latitude) &&
      (!_.isNaN(account.longitude) && !_.isNaN(account.latitude))
    );
  if (hasLocation) {
    _account.location = {
      type: 'Point',
      coordinates: [Number(account.longitude), Number(account.latitude)]
    };
  }

  return _account;

};


/**
 * @name normalizeAccount
 * @function normalizeAccount
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
        close: Number(bill.closeBalance || 0), // equal to outstand at begin but after payments
        charges: Number(bill.currentCharges || 0), //bill.total_charges ? bill.total_charges : 0, //current charges
        debt: 0 // connection loan balance
      },
      items: items
    });

    return _bill;

    /* jshint camelcase:true */

  });


  //ensure sort order is desc by billed date
  _bills = _.orderBy(_bills, 'period.billedAt', 'desc');

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
 * @function getUserDetails
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
exports.getUserDetails = function getUserDetails(accountNumber, done) {

  const identity = _.toUpper(accountNumber);

  const USER_DETAILS_QUERY =
    `SELECT
  LTRIM(RTRIM(u.accountno)) AS number,
  CONCAT(LTRIM(RTRIM(u.firstname)), ' ', LTRIM(RTRIM(u.sirname))) AS name,
  LTRIM(RTRIM(u.phoneno)) AS phone,
  LTRIM(RTRIM(u.email)) AS email,
  LTRIM(RTRIM(u.dater)) AS verifiedAt
  FROM ${USER_TABLE_NAME} AS u WHERE
  UPPER(LTRIM(RTRIM(u.accountno))) = '${identity}'`;

  instance
    .raw(USER_DETAILS_QUERY).asCallback(function (error, results) {
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
 * @function getAccountDetails
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
exports.getAccountDetails = function getAccountDetails(accountNumber, done) {

  const identity = _.toUpper(accountNumber);

  const ACCOUNT_DETAILS_QUERY =
    `SELECT
  LTRIM(RTRIM(a.CUSTKEY)) AS number,
  CONCAT(LTRIM(RTRIM(a.INITIAL)), ' ', LTRIM(RTRIM(a.SURNAME))) AS name,
  LTRIM(RTRIM(a.CELL_TEL_NO)) AS phone,
  LTRIM(RTRIM(a.UA_ADRESS1)) AS plot,
  LTRIM(RTRIM(a.UA_ADDRESS3)) AS neighborhood,
  LTRIM(RTRIM(a.UA_ADDRESS4)) AS city
  FROM ${ACCOUNT_TABLE_NAME} AS a WHERE
  UPPER(LTRIM(RTRIM(a.CUSTKEY))) = '${identity}'`;

  instance
    .raw(ACCOUNT_DETAILS_QUERY).asCallback(function (error, results) {
      if (!error && results) {
        results = _.merge({}, results[0]);
        results = exports.normalizeAccount(results);
      }
      done(error, results);
    });

};


/**
 * @name getCustomerDetails
 * @function getCustomerDetails
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
exports.getCustomerDetails =
  function getCustomerDetails(accountNumber, done) {

    const identity = _.toUpper(accountNumber);

    const CUSTOMER_DETAILS_QUERY =
      `SELECT
  SUBSTRING(LTRIM(RTRIM(c.DEPM_CODE)), 1, 1) AS jurisdiction,
  LTRIM(RTRIM(c.CUSTKEY)) AS number,
  LTRIM(RTRIM(c.METER_REF)) AS _identity,
  LTRIM(RTRIM(c.SURNAME)) AS name,
  LTRIM(RTRIM(c.CELL_TEL_NO)) AS phone,
  LTRIM(RTRIM(c.UA_ADRESS1)) AS plot,
  LTRIM(RTRIM(c.UA_ADRESS2)) AS house,
  LTRIM(RTRIM(c.UA_ADRESS3)) AS neighborhood,
  LTRIM(RTRIM(c.UA_ADRESS4)) AS city,
  LTRIM(RTRIM(c.X_GPS)) AS longitude,
  LTRIM(RTRIM(c.Y_GPS)) AS latitude,
  LTRIM(RTRIM(c.Balance)) AS balance
  FROM ${CUSTOMER_TABLE_NAME} AS c
  WHERE UPPER(LTRIM(RTRIM(c.CUSTKEY))) = '${identity}'
  OR UPPER(LTRIM(RTRIM(c.METER_REF)))='${identity}'`;

    instance
      .raw(CUSTOMER_DETAILS_QUERY).asCallback(function (error, results) {
        if (!error && results) {
          results = _.merge({}, results[0]);
          results = exports.normalizeAccount(results);
        }
        done(error, results);
      });

  };


/**
 * @name getBillHistory
 * @function getBillHistory
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
exports.getBillHistory = function getBillHistory(accountNumber, done) {

  const identity = _.toUpper(accountNumber);

  const CURRENT_BILL_QUERY =
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
    FROM ${CURRENT_BILL_TABLE_NAME} AS b
    WHERE UPPER(LTRIM(RTRIM(b.CUSTKEY)))='${identity}'
    ORDER BY DATE_OF_READING DESC`;

  const PREVIOUS_BILL_QUERY =
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
    FROM ${PREVIOUS_BILL_TABLE_NAME} AS b
    WHERE UPPER(LTRIM(RTRIM(b.CUSTKEY)))='${identity}'
    ORDER BY DATE_OF_READING DESC`;

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
    WHERE UPPER(LTRIM(RTRIM(b.CUSTKEY)))='${identity}'
    ORDER BY DATE_OF_READING DESC`;

  Promise.all([
    instance.raw(CURRENT_BILL_QUERY),
    instance.raw(PREVIOUS_BILL_QUERY),
    instance.raw(BILL_HISTORY_QUERY)
  ]).then(function (results) {
    if (results) {
      results = [].concat(_.flatten(results));
      results = exports.normalizeBillHistory(results);
    }
    done(null, results);
  }).catch(function (error) {
    done(error);
  });

};

/**
 * @name shouldFetch
 * @function shouldFetch
 * @description Check if account need update
 * @param {String} accountNumber valid customer account number
 * @param {String} updatedAt last time account fetched
 * @param {Function} done a callback to invoke on success or error
 * @return {Boolean} whether account should be updated
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.shouldFetch = function shouldFetch(accountNumber, updatedAt, done) {

  const identity = _.toUpper(accountNumber);
  updatedAt = _.isDate(updatedAt) ? updatedAt.toISOString() : updatedAt;

  instance
    .raw(
      `SELECT COUNT(*) AS count FROM ${CUSTOMER_TABLE_NAME} AS cu
      WHERE (
        UPPER(LTRIM(RTRIM(cu.CUSTKEY))) = '${identity}'
        OR
        UPPER(LTRIM(RTRIM(cu.METER_REF))) = '${identity}'
      )
      AND
      (
        CONVERT(DATETIME, cu.LAST_PAY_DATE) > CONVERT(DATETIME, '${updatedAt}')
        OR
        CONVERT(DATETIME, REPLACE(REPLACE(REPLACE(cu.DueDate, ' ', '*^'), '^*', ''), '*^', ' ')) > CONVERT(DATETIME, '${updatedAt}')
    )`
    )
    .asCallback(function (error, results) {
      if (results) {
        results = _.first(results);
        results = results.count ? results.count > 0 : false;
      }
      done(error, results);
    });
};


/**
 * @name getAccount
 * @function getAccount
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
exports.getAccount = function getAccount(accountNumber, done) {


  //fetch customer details
  async.waterfall([

    function fetchCustomerDetails(next) {
      exports.getCustomerDetails(accountNumber, next);
    },

    function fetchRestCustomerDetails(customer, next) {
      async.parallel({

        account: function fetchAccountDetails(next) {
          exports.getAccountDetails(customer.number, next);
        },

        accessors: function fetchAccessorDetails(next) {
          exports.getUserDetails(customer.number, next);
        },

        bills: function fetchBillHistory(next) {
          exports.getBillHistory(customer.number, next);
        }

      }, function (error, results) {
        results.customer = customer;
        next(error, results);
      });
    }

  ], function (error, results) {

    //normalize results
    let _results =
      ({
        account: {},
        customer: {},
        bills: [],
        accessors: []
      });

    //process results
    if (!error) {

      _results = _.merge({}, _results, results);

      //merge account results
      _results.account = _.merge({}, results.customer, results.account);

      //set address
      const {
        plot,
        house,
        neighborhood,
        jurisdiction,
        city
      } = _results.account;
      _results.account.address = _.compact([
        plot, house, neighborhood,
        jurisdiction, city
      ]).join(', ');

      //ensure identity
      _results.account.identity = results.customer.identity;

      //ensure bill order
      let _bills =
        _.orderBy([].concat(_results.bills), 'period.billedAt', 'desc');
      const __bills = _.tail(_bills);

      //ensure latest bill balance after payment
      const _bill = _.merge({}, DEFAULT_BILL, _.first(_bills));
      _bill.balance.close =
        Number(_results.account.balance || _bill.balance.close);

      //reconstruct bills
      _bills = [].concat(_bill).concat(__bills);
      _bills = _.orderBy([].concat(_bills), 'period.billedAt', 'desc');

      //re-shape results
      _results =
        _.merge({}, _results.account, {
          accessors: _results.accessors,
          bills: _bills
        }, {
          fetchedAt: new Date()
        });

    }

    //continue
    done(error, _results);

  });

};


/**
 * @name fetchAccount
 * @function fetchAccount
 * @description Obtain full customer account details if it has been updated
 * since last time fetched
 * @param {String} accountNumber valid customer account number
 * @param {Function} done a callback to invoke on success or error
 * @return {Object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.fetchAccount = function fetchAccount(accountNumber, updatedAt, done) {

  //check if update is allowed
  exports
    .shouldFetch(accountNumber, updatedAt, function (error, shouldFetch) {
      //error: back off
      if (error) {
        done(error);
      }
      //dont update: back off
      else if (!shouldFetch) {
        done(null, {});
      }
      //update: update
      else {
        exports.getAccount(accountNumber, done);
      }
    });

};


/**
 * @name getAccountNumbers
 * @function getAccountNumbers
 * @description Obtain account numbers
 * @param {Function} done a callback to invoke on success or error
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
exports.getAccountNumbers =
  function getAccountNumbers(
    offset = DEFAULT_OFFSET, limit = DEFAULT_LIMIT,
    done = () => {}
  ) {

    const ACCOUNT_NUMBERS_QUERY =
      `SELECT
    DISTINCT CUSTKEY AS accountNumber
    FROM ${ACCOUNT_TABLE_NAME}
    ORDER BY CUSTKEY
    OFFSET ${offset} ROWS
    FETCH NEXT ${limit} ROWS ONLY`;

    instance
      .raw(ACCOUNT_NUMBERS_QUERY).asCallback(function (error, results) {
        if (!error && results) {
          results = _.compact([].concat(results));
        }
        done(error, results);
      });

  };


/**
 * @name getCounts
 * @function getCounts
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

  instance
    .raw(ACCOUNT_NUMBERS_QUERY).asCallback(function (error, results) {
      if (!error && results) {
        results = _.compact([].concat(results));
        results = _.merge({
          count: 0
        }, results[0]);
        results = results.count;
      }
      done(error, results);
    });

};
