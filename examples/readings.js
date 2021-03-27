import { getString } from '@lykmapipo/env';
import { createMeterReadings } from '../src';

const meterNumber = getString('DEFAULT_METER_NUMBER');
const accountNumber = getString('DEFAULT_ACCOUNT_NUMBER');
const phoneNumber = getString('DEFAULT_PHONE_NUMBER');
const readings = '234';
const optns = { accountNumber, phoneNumber, readings };

// request customer statements
createMeterReadings(optns, (error, readings) => {
  console.log(error, readings);
});
