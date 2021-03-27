import { expect, nock } from '@lykmapipo/test-helpers';

import accountResponse from './fixtures/account_details.json';
import accountDetails from './fixtures/account.json';
import customerResponse from './fixtures/customer_details.json';
import customerDetails from './fixtures/customer.json';
import currentBillResponse from './fixtures/current_bill.json';
import previousBillsResponse from './fixtures/previous_bills.json';
// import billsDetails from './fixtures/bills.json';
import pondResponse from './fixtures/ponds.json';
import readingResponse from './fixtures/readings.json';

import {
  DEFAULT_JURISDICTION,
  DEFAULT_CUSTOMER_CATEGORY,
  DEFAULT_PHONE_NUMBER,
  DEFAULT_LOCALE,
  DEFAULT_SAMPLING_BILL_PERIODS,
  DEFAULT_BILL_PERIODS,
  DEFAULT_BILL_CURRENCY,
  DEFAULT_BILL_NOTES,
  DEFAULT_BILL_PAY_PERIOD,
  DEFAULT_BILL_DATE_FORMAT,
  DEFAULT_USER_DATE_FORMAT,
  DEFAULT_BILL_MONTH_FORMAT,
  DEFAULT_JURISDICTION_CODES,
  DEFAULT_ACCOUNT,
  DEFAULT_BILL,
  DEFAULT_USER,
  fetchAccount,
  fetchPondBillNumber,
  createMeterReadings,
} from '../src';

import {
  toDate,
  normalizeAccount,
  normalizeBillHistory,
  normalizeApiOptions,
  isSuccessResponse,
} from '../src/utils';

import {
  getAccount,
  getAccountDetails,
  getCustomerDetails,
  getBillHistory,
  getPondBillNumber,
  postMeterReadings,
} from '../src/api';

describe('majifix-int-dawasco', () => {
  beforeEach(() => {
    delete process.env.BILL_API_BASE_URL;
    delete process.env.BILL_API_ACCOUNT_DETAILS_URL;
    nock.cleanAll();
  });

  it('should expose defaults', () => {
    expect(DEFAULT_JURISDICTION).to.be.equal('Gerezani');
    expect(DEFAULT_CUSTOMER_CATEGORY).to.be.equal('Domestic');
    expect(DEFAULT_PHONE_NUMBER).to.be.equal('0743480898');
    expect(DEFAULT_LOCALE).to.be.equal('sw');
    expect(DEFAULT_SAMPLING_BILL_PERIODS).to.be.equal(6);
    expect(DEFAULT_BILL_PERIODS).to.be.equal(3);
    expect(DEFAULT_BILL_CURRENCY).to.be.equal('TZS');
    expect(DEFAULT_BILL_NOTES).to.be.equal(
      'LIPIA ANKARA YAKO MAPEMA KUEPUKA USUMBUFU WA KUKATIWA MAJI'
    );
    expect(DEFAULT_BILL_PAY_PERIOD).to.be.equal(7);
    expect(DEFAULT_BILL_DATE_FORMAT).to.be.eql(['MM/DD/YYYY', 'YYYY/MM/DD']);
    expect(DEFAULT_USER_DATE_FORMAT).to.be.eql(['DD-MM-YY HH:mm']);
    expect(DEFAULT_BILL_MONTH_FORMAT).to.be.equal('MMMMYYYY');
    expect(DEFAULT_JURISDICTION_CODES).to.be.eql([
      { code: 'C', name: 'Kinondoni' },
      { code: 'D', name: 'Magomeni' },
      { code: 'E', name: 'Kawe' },
      { code: 'L', name: 'Kibaha' },
      { code: 'G', name: 'Bagamoyo' },
      { code: 'H', name: 'Kibaha' },
      { code: 'F', name: 'Temeke' },
      { code: 'M', name: 'Ubungo' },
      { code: 'N', name: 'Tabata' },
      { code: 'K', name: 'Ilala' },
      { code: 'B', name: 'Ilala' },
      { code: 'J', name: 'Tegeta' },
    ]);
    expect(DEFAULT_ACCOUNT).to.be.eql({
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
    });
    expect(DEFAULT_BILL).to.be.eql({
      number: '',
      notes: DEFAULT_BILL_NOTES,
      currency: DEFAULT_BILL_CURRENCY,
      period: {},
      balance: {
        debt: 0,
      },
      items: [],
    });
    expect(DEFAULT_USER).to.be.eql({
      name: '',
      phone: '',
      email: '',
    });
  });

  it('should parse date', () => {
    expect(toDate).to.be.a('function');
  });

  it('should normalize account', () => {
    expect(normalizeAccount).to.be.a('function');
  });

  it('should normalize bill bistory', () => {
    expect(normalizeBillHistory).to.be.a('function');
  });

  it('should normalize api options', () => {
    expect(normalizeApiOptions).to.be.a('function');
    expect(
      normalizeApiOptions({
        accountNumber: 'A8801866',
        meterNumber: '15-17-D41320015',
        plateNumber: 'T525ABC',
        phoneNumber: '255754625756',
        pondNumber: '6',
        readings: '234',
      })
    ).to.eql({
      cust_acc: 'A8801866',
      accountno: 'A8801866',
      meter_no: '15-17-D41320015',
      meterno: '15-17-D41320015',
      plateno: 'T525ABC',
      phoneno: '255754625756',
      pond: '6',
      readings: '234',
    });

    expect(
      normalizeApiOptions({
        accountNumber: 'A880 1866',
        meterNumber: '15-17- D41320015',
        plateNumber: 'T 525 ABC',
        phoneNumber: '255 7546 25756',
        readings: '2 3 4',
      })
    ).to.eql({
      cust_acc: 'A8801866',
      accountno: 'A8801866',
      meter_no: '15-17-D41320015',
      meterno: '15-17-D41320015',
      plateno: 'T525ABC',
      phoneno: '255754625756',
      readings: '234',
    });
  });

  it('should check if response is success', () => {
    expect(isSuccessResponse({ success: undefined })).to.be.equal(false);
    expect(isSuccessResponse({ success: '1' })).to.be.equal(false);
    expect(isSuccessResponse({ success: '200' })).to.be.equal(true);
    expect(isSuccessResponse({ success: 200 })).to.be.equal(true);
    expect(isSuccessResponse({ success: 401 })).to.be.equal(false);
  });

  it('should obtain account details', (done) => {
    process.env.BILL_API_BASE_URL = 'https://127.0.0.1/v1/';

    process.env.BILL_API_ACCOUNT_DETAILS_URL =
      'https://127.0.0.1/v1/account_details';

    const optns = { accountNumber: 'A8801866' };

    nock(process.env.BILL_API_BASE_URL)
      .post('/account_details')
      .query(true)
      .reply(200, accountResponse);

    getAccountDetails(optns)
      .then((account) => {
        expect(account).to.exist;
        expect(account).to.be.eql(accountDetails);
        done(null, account);
      })
      .catch((error) => done(error));
  });

  it('should obtain customer details', (done) => {
    process.env.BILL_API_BASE_URL = 'https://127.0.0.1/v1/';

    process.env.BILL_API_CUSTOMER_DETAILS_URL =
      'https://127.0.0.1/v1/customer_details';

    const optns = { accountNumber: 'A8801866' };

    nock(process.env.BILL_API_BASE_URL)
      .post('/customer_details')
      .query(true)
      .reply(200, customerResponse);

    getCustomerDetails(optns)
      .then((customer) => {
        expect(customer).to.exist;
        expect(customer).to.be.eql(customerDetails);
        done(null, customer);
      })
      .catch((error) => done(error));
  });

  it('should obtain bill history', (done) => {
    process.env.BILL_API_BASE_URL = 'https://127.0.0.1/v1/';

    process.env.BILL_API_CURRENT_URL = 'https://127.0.0.1/v1/current_bill';

    process.env.BILL_API_PREVIOUS_URL = 'https://127.0.0.1/v1/previous_bills';

    const optns = { accountNumber: 'A8801866' };

    nock(process.env.BILL_API_BASE_URL)
      .post('/current_bill')
      .query(true)
      .reply(200, currentBillResponse);

    nock(process.env.BILL_API_BASE_URL)
      .post('/previous_bills')
      .query(true)
      .reply(200, previousBillsResponse);

    getBillHistory(optns)
      .then((bills) => {
        expect(bills).to.exist;
        // expect(bills).to.be.eql(billsDetails);
        done(null, bills);
      })
      .catch((error) => done(error));
  });

  it('should obtain account', (done) => {
    process.env.BILL_API_BASE_URL = 'https://127.0.0.1/v1/';

    process.env.BILL_API_ACCOUNT_DETAILS_URL =
      'https://127.0.0.1/v1/account_details';

    process.env.BILL_API_CUSTOMER_DETAILS_URL =
      'https://127.0.0.1/v1/customer_details';

    process.env.BILL_API_CURRENT_URL = 'https://127.0.0.1/v1/current_bill';

    process.env.BILL_API_PREVIOUS_URL = 'https://127.0.0.1/v1/previous_bills';

    const optns = { accountNumber: 'A8801866' };

    nock(process.env.BILL_API_BASE_URL)
      .post('/current_bill')
      .query(true)
      .reply(200, currentBillResponse);

    nock(process.env.BILL_API_BASE_URL)
      .post('/previous_bills')
      .query(true)
      .reply(200, previousBillsResponse);

    nock(process.env.BILL_API_BASE_URL)
      .post('/account_details')
      .query(true)
      .reply(200, accountResponse);

    nock(process.env.BILL_API_BASE_URL)
      .post('/customer_details')
      .query(true)
      .reply(200, customerResponse);

    getAccount(optns)
      .then((account) => {
        expect(account).to.exist;
        // expect(account).to.be.eql(accountDetails);
        done(null, account);
      })
      .catch((error) => done(error));
  });

  it('should fetch account', (done) => {
    process.env.BILL_API_BASE_URL = 'https://127.0.0.1/v1/';

    process.env.BILL_API_ACCOUNT_DETAILS_URL =
      'https://127.0.0.1/v1/account_details';

    process.env.BILL_API_CUSTOMER_DETAILS_URL =
      'https://127.0.0.1/v1/customer_details';

    process.env.BILL_API_CURRENT_URL = 'https://127.0.0.1/v1/current_bill';

    process.env.BILL_API_PREVIOUS_URL = 'https://127.0.0.1/v1/previous_bills';

    const accountNumber = 'A8801866';

    nock(process.env.BILL_API_BASE_URL)
      .post('/current_bill')
      .query(true)
      .reply(200, currentBillResponse);

    nock(process.env.BILL_API_BASE_URL)
      .post('/previous_bills')
      .query(true)
      .reply(200, previousBillsResponse);

    nock(process.env.BILL_API_BASE_URL)
      .post('/account_details')
      .query(true)
      .reply(200, accountResponse);

    nock(process.env.BILL_API_BASE_URL)
      .post('/customer_details')
      .query(true)
      .reply(200, customerResponse);

    fetchAccount(accountNumber, new Date(), (error, account) => {
      expect(account).to.exist;
      // expect(account).to.be.eql(accountDetails);
      done(error, account);
    });
  });

  it('should obtain pond bill', (done) => {
    process.env.BILL_API_BASE_URL = 'https://127.0.0.1/v1/';

    process.env.PONDS_API_BILL_NUMBER_URL =
      'https://127.0.0.1/v1/pond_bill_number';

    const optns = {
      plateNumber: 'T991DAU',
      phoneNumber: '255754625756',
      pondNumber: '1',
    };

    nock(process.env.BILL_API_BASE_URL)
      .post('/pond_bill_number')
      .query(true)
      .reply(200, pondResponse);

    getPondBillNumber(optns)
      .then((bill) => {
        expect(bill).to.exist;
        expect(bill).to.be.eql(pondResponse);
        done(null, bill);
      })
      .catch((error) => done(error));
  });

  it('should fetch pond bill', (done) => {
    process.env.BILL_API_BASE_URL = 'https://127.0.0.1/v1/';

    process.env.PONDS_API_BILL_NUMBER_URL =
      'https://127.0.0.1/v1/pond_bill_number';

    const optns = {
      plateNumber: 'T991DAU',
      phoneNumber: '255754625756',
      pondNumber: '1',
    };

    nock(process.env.BILL_API_BASE_URL)
      .post('/pond_bill_number')
      .query(true)
      .reply(200, pondResponse);

    fetchPondBillNumber(optns, (error, bill) => {
      expect(bill).to.exist;
      expect(bill).to.be.eql(pondResponse);
      done(error, bill);
    });
  });

  it('should post meter readings', (done) => {
    process.env.BILL_API_BASE_URL = 'https://127.0.0.1/v1/';

    process.env.BILL_API_METER_READINGS_URL =
      'https://127.0.0.1/v1/meter_readings';

    process.env.BILL_API_CUSTOMER_DETAILS_URL =
      'https://127.0.0.1/v1/customer_details';

    const optns = {
      accountNumber: 'A8801866',
      phoneNumber: '255754625756',
      readings: '234',
    };

    nock(process.env.BILL_API_BASE_URL)
      .post('/customer_details')
      .query(true)
      .reply(200, customerResponse);

    nock(process.env.BILL_API_BASE_URL)
      .post('/meter_readings')
      .query(true)
      .reply(200, readingResponse);

    postMeterReadings(optns)
      .then((readings) => {
        expect(readings).to.exist;
        expect(readings).to.be.eql(readingResponse);
        done(null, readings);
      })
      .catch((error) => done(error));
  });

  it('should create meter readings', (done) => {
    process.env.BILL_API_BASE_URL = 'https://127.0.0.1/v1/';

    process.env.BILL_API_METER_READINGS_URL =
      'https://127.0.0.1/v1/meter_readings';

    process.env.BILL_API_CUSTOMER_DETAILS_URL =
      'https://127.0.0.1/v1/customer_details';

    const optns = {
      meterNumber: '15-17-D00132154',
      phoneNumber: '255754625756',
      readings: '234',
    };

    nock(process.env.BILL_API_BASE_URL)
      .post('/customer_details')
      .query(true)
      .reply(200, customerResponse);

    nock(process.env.BILL_API_BASE_URL)
      .post('/meter_readings')
      .query(true)
      .reply(200, readingResponse);

    createMeterReadings(optns, (error, readings) => {
      expect(readings).to.exist;
      expect(readings).to.be.eql(readingResponse);
      done(error, readings);
    });
  });

  afterEach(() => {
    delete process.env.BILL_API_BASE_URL;
    delete process.env.BILL_API_ACCOUNT_DETAILS_URL;
    nock.cleanAll();
  });
});
