jest.mock('@actions/exec');
jest.mock('../../gcp-secret-manager/src/secrets');

const exec = require('@actions/exec');
const certificateExpiration = require('../src/alert-certificate-expiration');
const { loadSecrets } = require('../../gcp-secret-manager/src/secrets');

const today = new Date();
const monthBack = new Date(new Date().setDate(today.getDate() - 50)).toISOString();
const certificatesListExpired = { items: [{ status: { certificate: { certificate: 'cert', expires: today.toISOString() } } }] };
const certificatesList = { items: [{ status: { certificate: { certificate: 'cert', expires: monthBack } } }] };

describe('Alert platform team on slack', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it does not alert if certificate expires in over 30 days', async () => {
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(JSON.stringify(certificatesList)));
    loadSecrets.mockResolvedValueOnce('secret');

    await certificateExpiration('pipeline-sa', 'cluster-project');
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('it alerts if certificate expires in less than 29 days', async () => {
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(JSON.stringify(certificatesListExpired)));
    loadSecrets.mockResolvedValueOnce('secret');

    await certificateExpiration('pipeline-sa', 'cluster-project');
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
