jest.mock('@actions/exec');
const exec = require('@actions/exec');
const fetchToken = require('../src/fetch-token');

const mockExecListeners = (output) => (cmd, args, opts) => {
  opts.listeners.stdout(Buffer.from(output, 'utf8'));
  return Promise.resolve(0);
};

describe('Obtain an identity token', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Fetch token', async () => {
    const token = 'yJhbGciOiJSUzI1NiIsImtpZCI6Im';
    exec.exec
      .mockImplementationOnce(mockExecListeners(token));

    fetchToken(
      'my-sa@example.iam.gserviceaccount.com',
      'bhq-braveheart-quotes',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
