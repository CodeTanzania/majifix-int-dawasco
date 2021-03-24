import { expect, nock } from '@lykmapipo/test-helpers';

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
} from '../src';

describe('majifix-int-dawasco', () => {
  beforeEach(() => {
    delete process.env.BILL_API_BASE_URL;
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

  afterEach(() => {
    delete process.env.BILL_API_BASE_URL;
    nock.cleanAll();
  });
});
