import { getString } from '@lykmapipo/env';
import { fetchAccount } from '../src';

const accountNumber = getString('DEFAULT_ACCOUNT_NUMBER');

// request customer statements
fetchAccount(accountNumber, new Date(), (error, account) => {
  console.log(error, account);
});
