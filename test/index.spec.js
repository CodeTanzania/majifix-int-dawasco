import { expect, faker, nock } from '@lykmapipo/test-helpers';

describe('majifix-int-dawasco', () => {
  beforeEach(() => {
    delete process.env.BILL_API_BASE_URL;
    nock.cleanAll();
  });

  it('should send http post request', (done) => {
    process.env.BILL_API_BASE_URL = 'https://127.0.0.1/v1/';
    
    const data = { age: 11 };

    nock(process.env.BILL_API_BASE_URL)
      .post('/users')
      .query(true)
      .reply(201, data);

    post('/users', data)
      .then((user) => {
        expect(user).to.exist;
        expect(user).to.exist;
        expect(user).to.be.eql(data);
        done(null, user);
      })
      .catch((error) => {
        done(error);
      });
  });

  afterEach(() => {
    delete process.env.BILL_API_BASE_URL;
    nock.cleanAll();
  });
});
