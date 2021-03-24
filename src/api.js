import { merge } from 'lodash';
import { getString } from '@lykmapipo/env';
import { all, post, spread } from '@lykmapipo/http-client';

import {
  isSuccessResponse,
  extractAccountDetails,
  normalizeApiOptions,
} from './utils';

/**
 * @name getAccountDetails
 * @function getAccountDetails
 * @description Obtain customer account details
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
      throw new Error('Invalid Request');
    }

    // extract account from response
    const data = extractAccountDetails(response);

    // return account details
    return data;
  });
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
export const getCustomerDetails = (optns) => {
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
      throw new Error('Invalid Request');
    }

    // extract customer from response
    const data = extractAccountDetails(response);

    // return customer details
    return data;
  });
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
  // request account details (acccount, customer, accessors)
  const requests = [getAccountDetails(optns), getCustomerDetails(optns)];

  // issue all requests in parallel
  return all(...requests).then(
    spread((account = {}, customer = {}) => {
      // merge ddetails
      const myAccount = merge({}, customer, account);

      return myAccount;
    })
  );
};
