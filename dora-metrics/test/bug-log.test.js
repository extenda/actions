import * as exec from '@actions/exec';
import { afterEach, describe, expect, test, vi } from 'vitest';

import generateBugLog from '../src/bug-log.js';
import { generateFolders } from '../src/deploy-log.js';

const mockSearchJira = vi.fn();

vi.mock('../src/deploy-log.js');
vi.mock('@actions/exec');
vi.mock('@actions/core');
vi.mock(
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
    vi.resetAllMocks();
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
