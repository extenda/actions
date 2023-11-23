const { execGcloud } = require('../../setup-gcloud');
const fetchToken = require('../src/fetch-token');

jest.mock('../../setup-gcloud');

describe('Obtain an identity token', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Fetch token', async () => {
    const token = 'yJhbGciOiJSUzI1NiIsImtpZCI6Im';
    execGcloud.mockResolvedValueOnce(token);
    fetchToken(
      'my-sa@example.iam.gserviceaccount.com',
      'bhq-braveheart-quotes',
    );
    expect(execGcloud).toHaveBeenCalledWith([
      'auth',
      'print-identity-token',
      '--impersonate-service-account=my-sa@example.iam.gserviceaccount.com',
      '--include-email',
      '--audiences=bhq-braveheart-quotes',
    ]);
  });
});
