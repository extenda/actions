import * as exec from '@actions/exec';

import generateBugLog from '../src/bug-log.js';
import { generateFolders } from '../src/deploy-log.js';

const mockSearchJira = jest.fn();

jest.mock('../src/deploy-log');
jest.mock('@actions/exec');
jest.mock('@actions/core');
jest.mock(
  'jira-client',
  () =>
    function JiraClient() {
      return {
        searchJira: mockSearchJira,
      };
    },
);

const issue = {
  issues: [
    {
      fields: {
        created: '2020-08-31T09:45:11Z',
      },
    },
    {
      fields: {
        created: '2020-09-31T09:45:11Z',
      },
    },
  ],
};

describe('Generate bug log', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It executes all parts', async () => {
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    mockSearchJira.mockResolvedValueOnce(issue);

    await generateBugLog('jira-username', 'jira-password', 'jira-project-key');
    expect(generateFolders).toHaveBeenCalledTimes(2);
  });

  test('It works even when issue does not exist', async () => {
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    mockSearchJira.mockResolvedValueOnce('');
    await generateBugLog('jira-username', 'jira-password', 'jira-project-key');
    expect(generateFolders).toHaveBeenCalledTimes(0);
  });
});
