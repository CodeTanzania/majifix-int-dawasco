'use strict';

const lodash = require('lodash');
const env = require('@lykmapipo/env');
const common = require('@lykmapipo/common');
const httpClient = require('@lykmapipo/http-client');
const moment = require('moment');
const phone = require('@lykmapipo/phone');

// TODO: default longitude and latitude

const DEFAULT_JURISDICTION = env.getString(
  'DEFAULT_JURISDICTION',
  'Gerezani'
);

const DEFAULT_CUSTOMER_CATEGORY = env.getString(
  'DEFAULT_CUSTOMER_CATEGORY',
  'Domestic'
);
const DEFAULT_PHONE_NUMBER = env.getString(
  'DEFAULT_PHONE_NUMBER',
  '0743480898'
);

const DEFAULT_LOCALE = env.getString('DEFAULT_LOCALE', 'sw');

const DEFAULT_SAMPLING_BILL_PERIODS = env.getNumber(
  'DEFAULT_SAMPLING_BILL_PERIODS',
  6
);

const DEFAULT_BILL_PERIODS = env.getNumber('DEFAULT_BILL_PERIODS', 3);

const DEFAULT_BILL_CURRENCY = env.getString('DEFAULT_BILL_CURRENCY', 'TZS');

const DEFAULT_BILL_NOTES = env.getString(
  'DEFAULT_BILL_NOTES',
  'LIPIA ANKARA YAKO MAPEMA KUEPUKA USUMBUFU WA KUKATIWA MAJI'
);

const DEFAULT_BILL_PAY_PERIOD = env.getNumber('DEFAULT_BILL_PAY_PERIOD', 7);

const DEFAULT_BILL_DATE_FORMAT = env.getStrings(
  'DEFAULT_BILL_DATE_FORMAT',
  ['MM/DD/YYYY', 'YYYY/MM/DD'],
  { merge: true, unique: true }
);

const DEFAULT_USER_DATE_FORMAT = env.getStrings(
  'DEFAULT_USER_DATE_FORMAT',
  ['DD-MM-YY HH:mm'],
  { merge: true, unique: true }
);

const DEFAULT_BILL_MONTH_FORMAT = env.getString(
  'DEFAULT_BILL_MONTH_FORMAT',
  'MMMMYYYY'
);

const DEFAULT_JURISDICTION_CODES = lodash.compact(
  lodash.map(
    env.getStrings(
      'DEFAULT_JURISDICTION_CODES',
      [
        'C:Kinondoni',
        'D:Magomeni',
        'E:Kawe',
        'L:Kibaha',
        'G:Bagamoyo',
        'H:Kibaha',
        'F:Temeke',
        'M:Ubungo',
        'N:Tabata',
        'K:Ilala',
        'B:Ilala',
        'J:Tegeta',
      ],
      { merge: true, unique: true }
    ),
    (code) => {
      if (!lodash.isEmpty(code)) {
        const parts = code.split(':');
        return {
          code: lodash.first(parts),
          name: lodash.last(parts),
        };
      }
      return undefined;
    }
  )
);

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
  active: true,
};

const DEFAULT_BILL = {
  number: '',
  notes: DEFAULT_BILL_NOTES,
  currency: DEFAULT_BILL_CURRENCY,
  period: {},
  balance: {
    debt: 0,
  },
  items: [],
};

const DEFAULT_USER = {
  name: '',
  phone: '',
  email: '',
};

/**
 * @param {string} value Possible date to be parsed
 * @param {string[]} formats Allowable test formats
 * @name toDate
 * @function toDate
 * @description Convert date string to strings
 * @returns {Date} valid date object
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const toDate = (value, formats) => {
  // map value using date formats
  let dates = lodash.map([].concat(formats), (format) => {
    return moment(value, format);
  });

  // filter valid dates
  dates = lodash.filter(dates, (date) => {
    return date.isValid();
  });

  // obtain valid date
  dates = dates && dates.length > 0 ? dates[0] : undefined;

  return dates.toDate();
};

/**
 * @name normalizeAccount
 * @function normalizeAccount
 * @description Normalize customer account details
 * @param {object} account valid customer account details
 * @returns {object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const normalizeAccount = (account = {}) => {
  // ensure account
  const myAccount = lodash.merge({}, DEFAULT_ACCOUNT, account);

  // normalize jurisdiction
  let { jurisdiction } = account;
  if (!lodash.isEmpty(jurisdiction)) {
    jurisdiction = (
      lodash.find(DEFAULT_JURISDICTION_CODES, {
        code: jurisdiction,
      }) || {}
    ).name;
  }
  myAccount.jurisdiction = jurisdiction || DEFAULT_JURISDICTION;

  // force account number to uppercase
  myAccount.number = lodash.toUpper(account.number);
  myAccount.identity = lodash.toUpper(account.identity);

  // map phone to E164
  myAccount.phone = lodash.isEmpty(account.phone)
    ? DEFAULT_PHONE_NUMBER
    : account.phone;
  myAccount.phone = phone.toE164(account.phone);

  // transform plot, house, neighborhood, city
  myAccount.house = lodash.trim(lodash.replace(account.house, /BLOCK NO.|PLOT NO./g, ''));
  myAccount.neighborhood = lodash.trim(
    lodash.replace(account.neighborhood, /BLOCK NO.|PLOT NO./g, '')
  );
  // , account.house, account.neighborhood, account.city

  // set address
  const { plot, house, neighborhood, city } = myAccount;
  myAccount.address = lodash.compact([
    plot,
    house,
    neighborhood,
    jurisdiction,
    city,
  ]).join(', ');

  // ensure locations
  const hasLocation =
    account.longitude &&
    account.latitude &&
    !lodash.isNaN(account.longitude) &&
    !lodash.isNaN(account.latitude);
  if (hasLocation) {
    myAccount.location = {
      type: 'Point',
      coordinates: [Number(account.longitude), Number(account.latitude)],
    };
  }

  return myAccount;
};

/**
 * @name normalizeAccount
 * @param {object[]} bills Valid account bills
 * @function normalizeAccount
 * @description Normalize customer bill history
 * @returns {object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const normalizeBillHistory = (bills) => {
  // ensure bills collection
  let myBills = lodash.compact([].concat(bills));

  // shape bills accordingly
  myBills = lodash.map(bills, (bill) => {
    // merge defaults
    let myBill = lodash.merge({}, DEFAULT_BILL);

    // prepare dates
    const billedAt = bill.readingDate
      ? toDate(bill.readingDate, DEFAULT_BILL_DATE_FORMAT)
      : undefined;
    const duedAt = billedAt
      ? moment(billedAt).add(DEFAULT_BILL_PAY_PERIOD, 'days').toDate()
      : undefined;

    // prepare bill items

    // prepare previous reading
    const previousReadings = {
      name: 'Previous Readings', // SW
      quantity: Number(bill.previousReading || 0),
      unit: 'cbm',
    };

    // prepare current readings
    const currentReadings = {
      name: 'Current Readings',
      quantity: Number(bill.currentReading || 0),
      unit: 'cbm',
      time: bill.readingDate
        ? toDate(bill.readingDate, DEFAULT_BILL_DATE_FORMAT)
        : undefined,
    };

    // prepare consumption
    const consumed = {
      name: 'Water Charge',
      quantity: Number(bill.consumption || 0),
      unit: 'cbm',
      price: Number(bill.currentCharges || 0),
      items: lodash.compact([previousReadings, currentReadings]),
    };

    // TODO service charges
    const items = lodash.compact([consumed]);

    // pack bill
    myBill = lodash.merge({}, myBill, {
      number: bill.number,
      notes: bill.notes,
      currency: DEFAULT_BILL_CURRENCY,
      period: {
        name: moment(billedAt).format(DEFAULT_BILL_MONTH_FORMAT),
        billedAt,
        startedAt: undefined,
        endedAt: billedAt,
        duedAt, // 7days from billed date
      },
      balance: {
        outstand: Number(bill.outstandBalance || 0), // last month close balance + current charges
        open: Number(bill.openBalance || 0), // last month close balance
        close: Number(bill.closeBalance || 0), // equal to outstand at begin but after payments
        charges: Number(bill.currentCharges || 0), // bill.total_charges ? bill.total_charges : 0, //current charges
        debt: 0, // connection loan balance
      },
      items,
    });

    return myBill;
  });

  // ensure sort order is desc by billed date
  myBills = lodash.orderBy(myBills, 'period.billedAt', 'desc');

  // ensure periods start dates
  lodash.forEach(lodash.range(myBills.length), (period) => {
    if (period < DEFAULT_BILL_PERIODS) {
      myBills[period].period.startedAt = myBills[period + 1]
        ? (myBills[period + 1].period || {}).billedAt
        : undefined;
    }
  });

  // take required bill periods
  myBills = lodash.take(myBills, DEFAULT_BILL_PERIODS);

  return myBills;
};

/**
 * @name normalizeApiOptions
 * @function normalizeApiOptions
 * @description Normalize api options
 * @param {object} optns Valid api options
 * @param {object} optns.accountNumber Valid api options
 * @returns {object} Valid api options
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const normalizeApiOptions = (optns = {}) => {
  // common normalizer
  const toNormal = (val) => {
    if (val) {
      return lodash.toUpper(lodash.replace(String(val), /\s/g, ''));
    }
    return val;
  };

  // normalize options
  const options = common.mergeObjects({
    cust_acc: toNormal(optns.accountNumber),
    accountno: toNormal(optns.accountNumber),
    meter_no: toNormal(optns.meterNumber),
    meterno: toNormal(optns.meterNumber),
    plateno: toNormal(optns.plateNumber),
    phoneno: toNormal(optns.phoneNumber),
    pond: toNormal(optns.pondNumber),
    readings: toNormal(optns.readings),
  });

  // ensure phone number in E164
  if (options.phoneno) {
    options.phoneno = phone.toE164(options.phoneno) || options.phoneno;
  }

  // return options
  return options;
};

/**
 * @name isSuccessResponse
 * @function isSuccessResponse
 * @description Check if api response is success
 * @param {object} data Valid api response
 * @param {number} data.success Valid api success status
 * @returns {object} Whether api response is sucess
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const isSuccessResponse = (data = {}) => {
  // is successfully
  if (data.success && Number(data.success) === 200) {
    return true;
  }
  // not successfully
  return false;
};

/**
 * @name extractAccountDetails
 * @function extractAccountDetails
 * @description Extract account details from api response
 * @param {object} results Valid api response
 * @param {object[]} [results.feedh] Valid api data
 * @returns {object} Extracted account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const extractAccountDetails = (results = {}) => {
  // obtain api account data
  let data = lodash.get(results, 'feedh');
  data = lodash.compact([].concat(data));
  data = lodash.first(data);

  // prepare account
  let myAccount = {};

  // pick account data
  myAccount.jurisdiction = lodash.toUpper(
    lodash.trim(lodash.get(data, 'DEPM_CODE', '')).substring(0, 1)
  );
  myAccount.number = lodash.toUpper(lodash.trim(lodash.get(data, 'CUSTKEY')));
  myAccount.identity = lodash.toUpper(lodash.trim(lodash.get(data, 'METER_REF')));
  myAccount.name = lodash.toUpper(
    lodash.trim([lodash.trim(lodash.get(data, 'INITIAL')), lodash.trim(lodash.get(data, 'SURNAME'))].join(' '))
  );
  myAccount.phone = lodash.toUpper(lodash.trim(lodash.get(data, 'CELL_TEL_NO')));
  myAccount.plot = lodash.trim(lodash.get(data, 'UA_ADRESS1'));
  myAccount.house = lodash.trim(lodash.get(data, 'UA_ADRESS2'));
  myAccount.neighborhood = lodash.trim(lodash.get(data, 'UA_ADRESS3'));
  myAccount.city = lodash.trim(lodash.get(data, 'UA_ADRESS4'));
  myAccount.longitude = lodash.trim(lodash.get(data, 'X_GPS'));
  myAccount.latitude = lodash.trim(lodash.get(data, 'Y_GPS'));
  myAccount.balance = lodash.trim(lodash.get(data, 'Balance'));

  // normalize account data
  myAccount = normalizeAccount(myAccount);

  // return normalized account
  return myAccount;
};

/**
 * @name extractBillDetails
 * @function extractBillDetails
 * @description Extract bill details from api response
 * @param {object} results Valid api response
 * @param {object[]} [results.markers] Valid api data
 * @returns {object} Extracted bill details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const extractBillDetails = (results) => {
  let myBills = lodash.map(results, (data) => {
    // prepare bill data
    const myBill = {};

    // pick bills data
    myBill.accountNumber = lodash.toUpper(lodash.trim(lodash.get(data, 'CUSTKEY')));
    myBill.phone = lodash.toUpper(lodash.trim(lodash.get(data, 'CELL_TEL_NO')));
    myBill.name = lodash.toUpper(
      lodash.trim([lodash.trim(lodash.get(data, 'INITIAL')), lodash.trim(lodash.get(data, 'SURNAME'))].join(' '))
    );
    myBill.category = lodash.toUpper(lodash.trim(lodash.get(data, 'CONSUMER_TYPE_DESC')));
    myBill.number = lodash.toUpper(lodash.trim(lodash.get(data, 'GEPG_CONTROL_NO')));
    myBill.openBalance = lodash.trim(lodash.get(data, 'OPENING_BALANCE'));
    myBill.closeBalance = lodash.trim(lodash.get(data, 'CURRENT_BALANCE'));
    myBill.outstandBalance = lodash.trim(lodash.get(data, 'CURRENT_BALANCE'));
    myBill.currentCharges = lodash.trim(lodash.get(data, 'CURRENT_CHARGES'));
    myBill.currentReading = lodash.trim(lodash.get(data, 'CR_READING'));
    myBill.previousReading = lodash.trim(lodash.get(data, 'PR_READING'));
    myBill.readingDate = lodash.trim(lodash.get(data, 'DATE_OF_READING'));
    myBill.consumption = lodash.trim(lodash.get(data, 'CONSUMPTION'));

    // return normalized bill
    return myBill;
  });

  // compact myBills
  myBills = lodash.compact(myBills);
  return myBills;
};

/**
 * @name getCustomerDetails
 * @function getCustomerDetails
 * @description Obtain customer details
 * @param {object} optns Valid options
 * @param {string} optns.accountNumber Valid customer account number
 * @param {string} optns.meterNumber Valid customer meter number
 * @returns {object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const getCustomerDetails = (optns) => {
  // TODO: allow fetch customer identity

  // normalize api options
  const body = normalizeApiOptions(optns);

  // obtain customer details api url
  const BILL_API_CUSTOMER_DETAILS_URL = env.getString(
    'BILL_API_CUSTOMER_DETAILS_URL'
  );

  // request customer details
  return httpClient.post(BILL_API_CUSTOMER_DETAILS_URL, body).then((response = {}) => {
    // ensure success response
    if (!isSuccessResponse(response)) {
      throw new Error(response.message || 'Invalid Request');
    }

    // extract customer from response
    const data = extractAccountDetails(response);

    // return customer details
    return data;
  });
};

/**
 * @name getAccountDetails
 * @function getAccountDetails
 * @description Obtain customer account details
 * @param {object} optns Valid options
 * @param {string} optns.accountNumber Valid customer account number
 * @returns {object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const getAccountDetails = (optns) => {
  // normalize api options
  const body = normalizeApiOptions(optns);

  // obtain acount details api url
  const BILL_API_ACCOUNT_DETAILS_URL = env.getString(
    'BILL_API_ACCOUNT_DETAILS_URL'
  );

  // request account details
  return httpClient.post(BILL_API_ACCOUNT_DETAILS_URL, body).then((response = {}) => {
    // ensure success response
    if (!isSuccessResponse(response)) {
      throw new Error(response.message || 'Invalid Request');
    }

    // extract account from response
    const data = extractAccountDetails(response);

    // return account details
    return data;
  });
};

/**
 * @name getBillHistory
 * @function getBillHistory
 * @description Obtain customer bill history
 * @param {object} optns Valid options
 * @param {string} optns.accountNumber Valid customer account number
 * @returns {object} current bill
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const getBillHistory = (optns) => {
  // normalize api options
  const body = normalizeApiOptions(optns);

  // obtain current bill api url
  const BILL_API_CURRENT_URL = env.getString('BILL_API_CURRENT_URL');

  // obtain previous bills api url
  const BILL_API_PREVIOUS_URL = env.getString('BILL_API_PREVIOUS_URL');

  // get current bill
  const getCurrent = httpClient.post(BILL_API_CURRENT_URL, body).then((response = {}) => {
    // TODO: ensure success response

    // extract current bill from response
    let data = lodash.compact(lodash.get(response, 'markers', []));
    data = extractBillDetails(data);

    // return current bill
    return data;
  });

  // get previous bills
  const getPrevious = httpClient.post(BILL_API_PREVIOUS_URL, body).then(
    (response = {}) => {
      // TODO: ensure success response

      // extract previous bills from response
      let data = lodash.compact([].concat(response));
      data = extractBillDetails(data);

      // return previous bills
      return data;
    }
  );

  // request current and previous bills in parallel
  const requests = [getCurrent, getPrevious];
  return httpClient.all(...requests).then(
    httpClient.spread((current, previous) => {
      let bills = lodash.compact([].concat(current).concat(previous));
      bills = normalizeBillHistory(bills);
      return bills;
    })
  );
};

/**
 * @name getAccount
 * @function getAccount
 * @description Obtain full customer account details
 * @param {object} optns Valid options
 * @param {string} optns.accountNumber Valid customer account number
 * @param {string} optns.meterNumber Valid customer meter number
 * @returns {object} account customer account details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const getAccount = (optns) => {
  // first get customer details
  return getCustomerDetails(optns).then((customer) => {
    // obtain customer account number
    const opts = { accountNumber: customer.number };

    // request account details (acccount, accessors, bill history)
    const requests = [getAccountDetails(opts), getBillHistory(opts)];

    // issue all requests in parallel using
    return httpClient.all(...requests).then(
      // spread api rsults
      httpClient.spread((account = {}, bills = []) => {
        // prepare normalized account
        let myAccount = {
          account: {},
          customer: {},
          bills: [],
          accessors: [],
        };

        // merge account results
        myAccount.account = common.mergeObjects(customer, account);

        // ensure account identity
        myAccount.account.identity = customer.identity;

        // ensure bill order
        let myBills = lodash.orderBy([].concat(bills), 'period.billedAt', 'desc');

        // obtain previous bills
        const myPreviousBills = lodash.tail(myBills);

        // ensure latest bill balance after payment
        const myCurrentBill = common.mergeObjects(DEFAULT_BILL, lodash.first(myBills));
        myCurrentBill.balance.close = Number(
          account.balance || customer.balance || myCurrentBill.balance.close
        );

        // reconstruct bills
        myBills = [].concat(myCurrentBill).concat(myPreviousBills);
        myBills = lodash.orderBy([].concat(myBills), 'period.billedAt', 'desc');
        myAccount.bills = myBills;

        // re-shape results
        myAccount = common.mergeObjects(
          {},
          myAccount.account,
          {
            accessors: myAccount.accessors,
            bills: myAccount.bills,
          },
          {
            fetchedAt: new Date(),
          }
        );

        // return normalized account
        return myAccount;
      })
    );
  });
};

/**
 * @name fetchAccount
 * @function fetchAccount
 * @description Obtain full customer account details if it has been updated
 * since last time fetched
 * @param {string} accountNumber valid customer account number
 * @param {Date} updatedAt Last fetch date
 * @param {Function} done a callback to invoke on success or error
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const fetchAccount = (accountNumber, updatedAt, done) => {
  getAccount({ accountNumber })
    .then((account) => {
      done(null, account);
    })
    .catch((error) => {
      done(error);
    });
};

/**
 * @name getPondBillNumber
 * @function getPondBillNumber
 * @description Obtain pond bill pay number
 * @param {object} optns Valid options
 * @param {string} optns.plateNumber Valid customer car plate number
 * @param {string} optns.phoneNumber Valid customer phone number
 * @param {string} optns.pondNumber Valid pond number
 * @returns {object} pond bill pay details
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const getPondBillNumber = (optns) => {
  // normalize api options
  const body = normalizeApiOptions(optns);

  // obtain customer details api url
  const PONDS_API_BILL_NUMBER_URL = env.getString('PONDS_API_BILL_NUMBER_URL');

  // request ponds bill pay number
  return httpClient.post(PONDS_API_BILL_NUMBER_URL, body).then((response = {}) => {
    // ensure success response
    if (!isSuccessResponse(response)) {
      throw new Error(response.message || 'Invalid Request');
    }

    // extract ponds bill pay number from response
    const data = common.mergeObjects({}, response);

    // return ponds bill pay number
    return data;
  });
};

/**
 * @name fetchPondBillNumber
 * @function fetchPondBillNumber
 * @description Obtain pond bill pay number
 * @param {object} optns Valid options
 * @param {string} optns.plateNumber Valid customer car plate number
 * @param {string} optns.phoneNumber Valid customer phone number
 * @param {string} optns.pondNumber Valid pond number
 * @param {Function} done a callback to invoke on success or error
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const fetchPondBillNumber = (optns, done) => {
  getPondBillNumber(optns)
    .then((bill) => {
      done(null, bill);
    })
    .catch((error) => {
      done(error);
    });
};

/**
 * @name postMeterReadings
 * @function postMeterReadings
 * @description Post customer meter readings
 * @param {object} optns Valid options
 * @param {string} [optns.accountNumber] valid customer account number
 * @param {string} [optns.meterNumber] valid customer meter number
 * @param {string} optns.phoneNumber Valid customer phone number
 * @param {string} optns.readings Valid meter number
 * @returns {object} meter readings api response
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const postMeterReadings = (optns) => {
  // obtain meter readings api url
  const BILL_API_METER_READINGS_URL = env.getString('BILL_API_METER_READINGS_URL');

  // request customer details to get
  // valid account number
  return getCustomerDetails(optns)
    .then((customer) => {
      // obtain customer account number
      const opts = common.mergeObjects({ accountNumber: customer.number }, optns);
      return opts;
    })
    .then((opts) => {
      // normalize api options
      const body = normalizeApiOptions(opts);

      // post meter readings
      return httpClient.post(BILL_API_METER_READINGS_URL, body);
    })
    .then((response = {}) => {
      // ensure success response
      if (!isSuccessResponse(response)) {
        throw new Error(response.message || 'Invalid Request');
      }

      // extract current readings from response
      const data = common.mergeObjects({}, response);

      // return current readings
      return data;
    });
};

/**
 * @name createMeterReadings
 * @function createMeterReadings
 * @description Create customer meter readings
 * @param {object} optns Valid options
 * @param {string} [optns.accountNumber] valid customer account number
 * @param {string} [optns.meterNumber] valid customer meter number
 * @param {string} optns.phoneNumber Valid customer phone number
 * @param {string} optns.readings Valid meter number
 * @param {Function} done a callback to invoke on success or error
 * @author lally elias <lallyelias87@mail.com>
 * @since 0.1.0
 * @version 0.1.0
 * @public
 * @static
 */
const createMeterReadings = (optns, done) => {
  postMeterReadings(optns)
    .then((readings) => {
      done(null, readings);
    })
    .catch((error) => {
      done(error);
    });
};

exports.DEFAULT_ACCOUNT = DEFAULT_ACCOUNT;
exports.DEFAULT_BILL = DEFAULT_BILL;
exports.DEFAULT_BILL_CURRENCY = DEFAULT_BILL_CURRENCY;
exports.DEFAULT_BILL_DATE_FORMAT = DEFAULT_BILL_DATE_FORMAT;
exports.DEFAULT_BILL_MONTH_FORMAT = DEFAULT_BILL_MONTH_FORMAT;
exports.DEFAULT_BILL_NOTES = DEFAULT_BILL_NOTES;
exports.DEFAULT_BILL_PAY_PERIOD = DEFAULT_BILL_PAY_PERIOD;
exports.DEFAULT_BILL_PERIODS = DEFAULT_BILL_PERIODS;
exports.DEFAULT_CUSTOMER_CATEGORY = DEFAULT_CUSTOMER_CATEGORY;
exports.DEFAULT_JURISDICTION = DEFAULT_JURISDICTION;
exports.DEFAULT_JURISDICTION_CODES = DEFAULT_JURISDICTION_CODES;
exports.DEFAULT_LOCALE = DEFAULT_LOCALE;
exports.DEFAULT_PHONE_NUMBER = DEFAULT_PHONE_NUMBER;
exports.DEFAULT_SAMPLING_BILL_PERIODS = DEFAULT_SAMPLING_BILL_PERIODS;
exports.DEFAULT_USER = DEFAULT_USER;
exports.DEFAULT_USER_DATE_FORMAT = DEFAULT_USER_DATE_FORMAT;
exports.createMeterReadings = createMeterReadings;
exports.fetchAccount = fetchAccount;
exports.fetchPondBillNumber = fetchPondBillNumber;
