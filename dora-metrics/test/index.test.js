jest.mock('@actions/core');
jest.mock('../src/bug-log');
jest.mock('../src/deploy-log');

const core = require('@actions/core');
const action = require('../src/index');
const generateBugLog = require('../src/bug-log');
const { generateFolders } = require('../src/deploy-log');

describe('DORA metrics action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    core.getInput.mockReturnValueOnce('iam')
      .mockReturnValueOnce('product-component')
      .mockReturnValueOnce('jira-username')
      .mockReturnValueOnce('jira-password')
      .mockReturnValueOnce('jira-project-key');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(5);
    expect(generateBugLog).toHaveBeenCalledWith(
      'jira-username',
      'jira-password',
      'jira-project-key',
      'iam',
      'product-component',
    );
    expect(generateFolders).toHaveBeenCalledWith(
      'iam',
    );
  });
});
