import {
  compact,
  filter,
  find,
  first,
  forEach,
  get,
  isEmpty,
  isNaN as isNAN,
  map,
  merge,
  toUpper,
  trim,
  orderBy,
  replace,
  range,
  take,
} from 'lodash';
import moment from 'moment';
import { mergeObjects } from '@lykmapipo/common';
import { toE164 } from '@lykmapipo/phone';

import {
  DEFAULT_JURISDICTION,
  DEFAULT_PHONE_NUMBER,
  DEFAULT_BILL_PERIODS,
  DEFAULT_BILL_CURRENCY,
  DEFAULT_BILL_PAY_PERIOD,
  DEFAULT_BILL_DATE_FORMAT,
  DEFAULT_BILL_MONTH_FORMAT,
  DEFAULT_JURISDICTION_CODES,
  DEFAULT_ACCOUNT,
  DEFAULT_BILL,
} from './defaults';

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
export const toDate = (value, formats) => {
  // map value using date formats
  let dates = map([].concat(formats), (format) => {
    return moment(value, format);
  });

  // filter valid dates
  dates = filter(dates, (date) => {
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
export const normalizeAccount = (account = {}) => {
  // ensure account
  const myAccount = merge({}, DEFAULT_ACCOUNT, account);

  // normalize jurisdiction
  let { jurisdiction } = account;
  if (!isEmpty(jurisdiction)) {
    jurisdiction = (
      find(DEFAULT_JURISDICTION_CODES, {
        code: jurisdiction,
      }) || {}
    ).name;
  }
  myAccount.jurisdiction = jurisdiction || DEFAULT_JURISDICTION;

  // force account number to uppercase
  myAccount.number = toUpper(account.number);
  myAccount.identity = toUpper(account.identity);

  // map phone to E164
  myAccount.phone = isEmpty(account.phone)
    ? DEFAULT_PHONE_NUMBER
    : account.phone;
  myAccount.phone = toE164(account.phone);

  // transform plot, house, neighborhood, city
  myAccount.house = trim(replace(account.house, /BLOCK NO.|PLOT NO./g, ''));
  myAccount.neighborhood = trim(
    replace(account.neighborhood, /BLOCK NO.|PLOT NO./g, '')
  );
  // , account.house, account.neighborhood, account.city

  // set address
  const { plot, house, neighborhood, city } = myAccount;
  myAccount.address = compact([
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
    !isNAN(account.longitude) &&
    !isNAN(account.latitude);
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
export const normalizeBillHistory = (bills) => {
  // ensure bills collection
  let myBills = compact([].concat(bills));

  // shape bills accordingly
  myBills = map(bills, (bill) => {
    // merge defaults
    let myBill = merge({}, DEFAULT_BILL);

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
      items: compact([previousReadings, currentReadings]),
    };

    // TODO service charges
    const items = compact([consumed]);

    // pack bill
    myBill = merge({}, myBill, {
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
  myBills = orderBy(myBills, 'period.billedAt', 'desc');

  // ensure periods start dates
  forEach(range(myBills.length), (period) => {
    if (period < DEFAULT_BILL_PERIODS) {
      myBills[period].period.startedAt = myBills[period + 1]
        ? (myBills[period + 1].period || {}).billedAt
        : undefined;
    }
  });

  // take required bill periods
  myBills = take(myBills, DEFAULT_BILL_PERIODS);

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
export const normalizeApiOptions = (optns = {}) => {
  // common normalizer
  const toNormal = (val) => {
    if (val) {
      return toUpper(replace(val, /\s/g, ''));
    }
    return val;
  };

  // normalize options
  const options = mergeObjects({
    cust_acc: toNormal(optns.accountNumber),
    meter_no: toNormal(optns.meterNumber),
    plateno: toNormal(optns.plateNumber),
    phoneno: toNormal(optns.phoneNumber),
  });

  // TODO: ensure phone number in E164

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
export const isSuccessResponse = (data = {}) => {
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
export const extractAccountDetails = (results = {}) => {
  // obtain api account data
  let data = get(results, 'feedh');
  data = compact([].concat(data));
  data = first(data);

  // prepare account
  let myAccount = {};

  // pick account data
  myAccount.jurisdiction = toUpper(
    trim(get(data, 'DEPM_CODE', '')).substring(0, 1)
  );
  myAccount.number = toUpper(trim(get(data, 'CUSTKEY')));
  myAccount.name = toUpper(
    [trim(get(data, 'INITIAL')), trim(get(data, 'SURNAME'))].join(' ')
  );
  myAccount.phone = toUpper(trim(get(data, 'CELL_TEL_NO')));
  myAccount.plot = trim(get(data, 'UA_ADRESS1'));
  myAccount.house = trim(get(data, 'UA_ADRESS2'));
  myAccount.neighborhood = trim(get(data, 'UA_ADRESS3'));
  myAccount.city = trim(get(data, 'UA_ADRESS4'));

  // normalize accout data
  myAccount = normalizeAccount(myAccount);

  // return normalized account
  return myAccount;
};
