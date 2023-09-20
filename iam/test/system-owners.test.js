jest.mock('@actions/core');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../setup-gcloud');

const projectInfo = require('../../cloud-run/src/project-info');
// const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const getSystemOwners = require('../src/system-owners');
const { setupGcloud, execGcloud } = require('../../setup-gcloud');

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
  afterEach(() => {
    jest.resetAllMocks();
  });
  test('it can return clan member from yaml', async () => {
    setupGcloud.mockResolvedValueOnce('test-prod-123');
    projectInfo.mockResolvedValueOnce({ project: 'test' });
    execGcloud
      .mockResolvedValueOnce([{}, {}, { id: '000111' }])
      .mockResolvedValueOnce('tribe');
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
    expect(execGcloud).toHaveBeenCalledTimes(2);
    expect(execGcloud).toHaveBeenCalledWith(['projects', 'get-ancestors', 'test-prod-123', '--format=json']);
    expect(execGcloud).toHaveBeenCalledWith([
      'resource-manager',
      'folders',
      'describe',
      '000111',
      '--format=value(displayName)',
    ]);
  });
});
