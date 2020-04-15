jest.mock('@actions/core');
jest.mock('../src/jira-release');

const core = require('@actions/core');
const { createJiraRelease } = require('../src/jira-release');
const action = require('../src/index');

const orgEnv = process.env;

describe('Jira Release Action', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      JIRA_USERNAME: 'test',
      JIRA_PASSWORD: 'pwd',
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('It fails for missing JIRA_USERNAME', async () => {
    delete process.env.JIRA_USERNAME;
    await expect(action()).rejects.toEqual(new Error('Missing env var: JIRA_USERNAME'));
  });

  test('It fails for missing JIRA_PASSWORD', async () => {
    delete process.env.JIRA_PASSWORD;
    await expect(action()).rejects.toEqual(new Error('Missing env var: JIRA_PASSWORD'));
  });

  test('It will use passed inputs', async () => {
    core.getInput.mockReturnValueOnce('https')
      .mockReturnValueOnce('jira.test.com')
      .mockReturnValueOnce('TEST')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('2.0.0');

    await action();
    expect(createJiraRelease).toHaveBeenCalledWith({
      protocol: 'https',
      host: 'jira.test.com',
      projectKey: 'TEST',
      component: '',
      version: '2.0.0',
    });
  });
});
