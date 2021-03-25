import { compact, first, get, orderBy, tail } from 'lodash';
import { mergeObjects } from '@lykmapipo/common';
import { getString } from '@lykmapipo/env';
import { all, post, spread } from '@lykmapipo/http-client';

import { DEFAULT_BILL } from './defaults';

import {
  isSuccessResponse,
  extractAccountDetails,
  extractBillDetails,
  normalizeBillHistory,
  normalizeApiOptions,
} from './utils';

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
export const getCustomerDetails = (optns) => {
  // TODO: allow fetch customer identity

  // normalize api options
  const body = normalizeApiOptions(optns);

  // obtain customer details api url
  const BILL_API_CUSTOMER_DETAILS_URL = getString(
    'BILL_API_CUSTOMER_DETAILS_URL'
  );

  // request customer details
  return post(BILL_API_CUSTOMER_DETAILS_URL, body).then((response = {}) => {
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
export const getAccountDetails = (optns) => {
  // normalize api options
  const body = normalizeApiOptions(optns);

  // obtain acount details api url
  const BILL_API_ACCOUNT_DETAILS_URL = getString(
    'BILL_API_ACCOUNT_DETAILS_URL'
  );

  // request account details
  return post(BILL_API_ACCOUNT_DETAILS_URL, body).then((response = {}) => {
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
export const getBillHistory = (optns) => {
  // normalize api options
  const body = normalizeApiOptions(optns);

  // obtain current bill api url
  const BILL_API_CURRENT_URL = getString('BILL_API_CURRENT_URL');

  // obtain previous bills api url
  const BILL_API_PREVIOUS_URL = getString('BILL_API_PREVIOUS_URL');

  // get current bill
  const getCurrent = post(BILL_API_CURRENT_URL, body).then((response = {}) => {
    // TODO: ensure success response

    // extract current bill from response
    let data = compact(get(response, 'markers', []));
    data = extractBillDetails(data);

    // return current bill
    return data;
  });

  // get previous bills
  const getPrevious = post(BILL_API_PREVIOUS_URL, body).then(
    (response = {}) => {
      // TODO: ensure success response

      // extract previous bills from response
      let data = compact([].concat(response));
      data = extractBillDetails(data);

      // return previous bills
      return data;
    }
  );

  // request current and previous bills in parallel
  const requests = [getCurrent, getPrevious];
  return all(...requests).then(
    spread((current, previous) => {
      let bills = compact([].concat(current).concat(previous));
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
export const getAccount = (optns) => {
  // first get customer details
  return getCustomerDetails(optns).then((customer) => {
    // obtain customer account number
    const opts = { accountNumber: customer.number };

    // request account details (acccount, accessors, bill history)
    const requests = [getAccountDetails(opts), getBillHistory(opts)];

    // issue all requests in parallel using
    return all(...requests).then(
      // spread api rsults
      spread((account = {}, bills = []) => {
        // prepare normalized account
        let myAccount = {
          account: {},
          customer: {},
          bills: [],
          accessors: [],
        };

        // merge account results
        myAccount.account = mergeObjects(customer, account);

        // ensure account identity
        myAccount.account.identity = customer.identity;

        // ensure bill order
        let myBills = orderBy([].concat(bills), 'period.billedAt', 'desc');

        // obtain previous bills
        const myPreviousBills = tail(myBills);

        // ensure latest bill balance after payment
        const myCurrentBill = mergeObjects(DEFAULT_BILL, first(myBills));
        myCurrentBill.balance.close = Number(
          account.balance || customer.balance || myCurrentBill.balance.close
        );

        // reconstruct bills
        myBills = [].concat(myCurrentBill).concat(myPreviousBills);
        myBills = orderBy([].concat(myBills), 'period.billedAt', 'desc');
        myAccount.bills = myBills;

        // re-shape results
        myAccount = mergeObjects(
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
export const fetchAccount = (accountNumber, updatedAt, done) => {
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
export const getPondBillNumber = (optns) => {
  // normalize api options
  const body = normalizeApiOptions(optns);

  // obtain customer details api url
  const PONDS_API_BILL_NUMBER_URL = getString('PONDS_API_BILL_NUMBER_URL');

  // request ponds bill pay number
  return post(PONDS_API_BILL_NUMBER_URL, body).then((response = {}) => {
    // ensure success response
    if (!isSuccessResponse(response)) {
      throw new Error(response.message || 'Invalid Request');
    }

    // extract ponds bill pay number from response
    const data = mergeObjects({}, response);

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
export const fetchPondBillNumber = (optns, done) => {
  getPondBillNumber(optns)
    .then((bill) => {
      done(null, bill);
    })
    .catch((error) => {
      done(error);
    });
};
