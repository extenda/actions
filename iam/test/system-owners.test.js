const mockFs = require('mock-fs');

jest.mock('@actions/core');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../setup-gcloud');

const projectInfo = require('../../cloud-run/src/project-info');
// const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const getSystemOwners = require('../src/system-owners');
const { setupGcloud } = require('../../setup-gcloud');

const mockContents = jest.fn();

jest.mock('@actions/github', () => ({
  getOctokit: () => ({
    rest: {
      repos: {
        getContent: mockContents,
      },
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
  beforeEach(() => {
    mockFs({
      'infra/common.hcl': `
locals {
  tribe_name              = "test-tribe"
  clan_name               = "test"
}`,
    });
  });
  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  });
  test('it can return clan member from yaml', async () => {
    setupGcloud.mockResolvedValueOnce('test-prod-123');
    projectInfo.mockReturnValueOnce({ project: 'test' });
    const serviceAccountKey = 'service-account';
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

    const owners = await getSystemOwners('token', serviceAccountKey);
    expect(owners).toEqual(['test@mail.com']);
    expect(mockContents).toHaveBeenCalledWith({
      owner: 'extenda',
      path: 'organization/extendaretail-com/departments/product-development/test-tribe/clans/test/clan.yaml',
      repo: 'tf-infra-gcp',
    });
  });
});
