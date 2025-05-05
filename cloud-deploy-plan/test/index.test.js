const core = require('@actions/core');
const action = require('../src/index');
const { setupGcloud } = require('../../setup-gcloud');
const getToken = require('../../cloud-deploy/src/utils/identity-token');
const getDeployInfo = require('../src/deploy-info');
const loadServiceDefinition = require('../../cloud-deploy/src/utils/service-definition');
const { getPullRequestNumber, postComment } = require('../src/pr-comment');

jest.mock('@actions/core');
jest.mock('../src/deploy-info');
jest.mock('../src/pr-comment');
jest.mock('../../cloud-deploy/src/utils/identity-token');
jest.mock('../../setup-gcloud');
jest.mock('../../cloud-deploy/src/utils/service-definition');

describe('cloud-deploy-plan', () => {
  beforeEach(() => {
    setupGcloud.mockResolvedValueOnce('project-id');
    getToken.mockResolvedValueOnce('token');
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It can plan multiple files in a PRs', async () => {
    core.getInput
      .mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce('gh-token');

    core.getMultilineInput.mockReturnValueOnce([
      'cloud-deploy1.yaml',
      'cloud-deploy2.yaml',
    ]);
    loadServiceDefinition
      .mockReturnValueOnce({
        'cloud-run': {
          name: 'service1',
        },
      })
      .mockReturnValueOnce({ 'cloud-run': { name: 'service2' } });

    getDeployInfo
      .mockResolvedValueOnce({
        serviceName: 'service1',
        updates: false,
        vulnerabilities: false,
      })
      .mockResolvedValueOnce({
        serviceName: 'service2',
        updates: false,
        vulnerabilities: false,
      });

    getPullRequestNumber.mockResolvedValueOnce(1);

    await action();

    expect(getDeployInfo).toHaveBeenCalledTimes(2);
    expect(postComment).toHaveBeenCalledWith(
      'gh-token',
      1,
      expect.stringContaining('service2'),
    );
  });

  test('It skips the plan in non-PRs', async () => {
    getPullRequestNumber.mockResolvedValueOnce(NaN);
    core.getInput
      .mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce('gh-token');
    core.getMultilineInput.mockReturnValueOnce(['cloud-deploy.yaml']);

    await action();

    expect(getDeployInfo).not.toHaveBeenCalled();
  });
});
