const core = require('@actions/core');
const handleNFSServer = require('../src/create-tenant-nfs-dir');
const gcloudOutput = require('../src/gcloud-output');

jest.mock('@actions/exec');
jest.mock('@actions/core');
jest.mock('../src/gcloud-output');

describe('Handle nfs tenant directory', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run kubectl commands', async () => {
    const nfsJson = { items: [{ metadata: { name: 'nfs-server-name' } }] };
    gcloudOutput.mockResolvedValueOnce(JSON.stringify(nfsJson));
    gcloudOutput.mockResolvedValueOnce(0);

    await handleNFSServer('tenant-name');
    expect(core.info).toHaveBeenCalledTimes(0);
    expect(gcloudOutput).toHaveBeenCalledTimes(2);
    expect(gcloudOutput).toHaveBeenNthCalledWith(2, ['exec', '--namespace=txengine-nfs-server', 'nfs-server-name', '--', 'mkdir', '/exports/tenant-name'], 'kubectl');
  });

  test('It runs even if dir exists', async () => {
    const nfsJson = { items: [{ metadata: { name: 'nfs-server-name' } }] };
    gcloudOutput.mockResolvedValueOnce(JSON.stringify(nfsJson));
    gcloudOutput.mockRejectedValueOnce(0);

    await handleNFSServer('tenant-name');
    expect(core.info).toHaveBeenCalledTimes(1);
    expect(gcloudOutput).toHaveBeenCalledTimes(2);
  });
});
