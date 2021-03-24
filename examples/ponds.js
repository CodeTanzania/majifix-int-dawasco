import { getString } from '@lykmapipo/env';
import { fetchPondBillNumber } from '../src';

const plateNumber = getString('DEFAULT_PLATE_NUMBER');
const phoneNumber = getString('DEFAULT_PHONE_NUMBER');
const pondNumber = getString('DEFAULT_POND_NUMBER');
const optns = { plateNumber, phoneNumber, pondNumber };

// request pond bill number
fetchPondBillNumber(optns, (error, bill) => {
  console.log(error, bill);
});
