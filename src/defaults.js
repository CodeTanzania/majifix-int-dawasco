import { compact, first, isEmpty, last, map } from 'lodash';
import { getString, getNumber, getStrings } from '@lykmapipo/env';

// TODO: default longitude and latitude

export const DEFAULT_JURISDICTION = getString(
  'DEFAULT_JURISDICTION',
  'Gerezani'
);

export const DEFAULT_CUSTOMER_CATEGORY = getString(
  'DEFAULT_CUSTOMER_CATEGORY',
  'Domestic'
);
export const DEFAULT_PHONE_NUMBER = getString(
  'DEFAULT_PHONE_NUMBER',
  '0743480898'
);

export const DEFAULT_LOCALE = getString('DEFAULT_LOCALE', 'sw');

export const DEFAULT_SAMPLING_BILL_PERIODS = getNumber(
  'DEFAULT_SAMPLING_BILL_PERIODS',
  6
);

export const DEFAULT_BILL_PERIODS = getNumber('DEFAULT_BILL_PERIODS', 3);

export const DEFAULT_BILL_CURRENCY = getString('DEFAULT_BILL_CURRENCY', 'TZS');

export const DEFAULT_BILL_NOTES = getString(
  'DEFAULT_BILL_NOTES',
  'LIPIA ANKARA YAKO MAPEMA KUEPUKA USUMBUFU WA KUKATIWA MAJI'
);

export const DEFAULT_BILL_PAY_PERIOD = getNumber('DEFAULT_BILL_PAY_PERIOD', 7);

export const DEFAULT_BILL_DATE_FORMAT = getStrings(
  'DEFAULT_BILL_DATE_FORMAT',
  ['MM/DD/YYYY', 'YYYY/MM/DD'],
  { merge: true, unique: true }
);

export const DEFAULT_USER_DATE_FORMAT = getStrings(
  'DEFAULT_USER_DATE_FORMAT',
  ['DD-MM-YY HH:mm'],
  { merge: true, unique: true }
);

export const DEFAULT_BILL_MONTH_FORMAT = getString(
  'DEFAULT_BILL_MONTH_FORMAT',
  'MMMMYYYY'
);

export const DEFAULT_JURISDICTION_CODES = compact(
  map(
    getStrings(
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
      if (!isEmpty(code)) {
        const parts = code.split(':');
        return {
          code: first(parts),
          name: last(parts),
        };
      }
      return undefined;
    }
  )
);

export const DEFAULT_ACCOUNT = {
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

export const DEFAULT_BILL = {
  number: '',
  notes: DEFAULT_BILL_NOTES,
  currency: DEFAULT_BILL_CURRENCY,
  period: {},
  balance: {
    debt: 0,
  },
  items: [],
};

export const DEFAULT_USER = {
  name: '',
  phone: '',
  email: '',
};
