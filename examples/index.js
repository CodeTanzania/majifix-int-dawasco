import { getStatements } from '@codetanzania/majifix-int-dawasco';

process.env.BILL_BASE_URL = '';

// request customer statements
getStatements({ accountNumber: '' })
  .then(statements => {
    console.log(data);
  })
  .catch(error => {
    console.log(error);
  });
