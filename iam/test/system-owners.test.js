jest.mock('@actions/core');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../setup-gcloud/src/setup-gcloud');

const projectInfo = require('../../cloud-run/src/project-info');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const getSystemOwners = require('../src/system-owners');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');

const mockContents = jest.fn();

jest.mock('@actions/github', () => ({
  getOctokit: () => ({
    repos: {
      getContent: mockContents,
    },
  }),
  context: {
    repo: () => ({
      owner: 'extenda',
      repo: 'tf-github',
    }),
    payload: {},
  },
}));

describe('get system owners', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });
  test('it can return clan member from yaml', async () => {
    setupGcloud.mockResolvedValueOnce('test');
    projectInfo.mockResolvedValueOnce('tribe');
    const clusterInfoResponse = {
      project: 'tribe-prod-1242',
    };

    getClusterInfo.mockReturnValue(clusterInfoResponse);
    const serviceAccountKey = 'service-account';

    projectInfo.mockResolvedValueOnce({ project: 'test-prod-123' });
    getClusterInfo.mockReturnValue(clusterInfoResponse);
    mockContents.mockResolvedValueOnce({
      data: {
        content: Buffer.from(`
members:
  users:
    - name: test
      email: test@mail.com
      `, 'utf8').toString('base64'),
      },
    });

    await getSystemOwners('token', serviceAccountKey);
  });
});
