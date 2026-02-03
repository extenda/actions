import getRuntimeAccount from '../src/runtime-account.js';

describe('Runtime Email Account', () => {
  test('It appends fully-qualified email for prefix', () => {
    const account = getRuntimeAccount('test-account', 'test-project-1234');
    expect(account).toEqual(
      'test-account@test-project-1234.iam.gserviceaccount.com',
    );
  });

  test('It preserves fully-qualified email argument', () => {
    const email = 'my-account@test-1234.iam.gserviceaccount.com';
    const account = getRuntimeAccount(email);
    expect(account).toEqual(email);
  });
});
