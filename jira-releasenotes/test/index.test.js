import * as core from '@actions/core';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

import action from '../src/index.js';
import * as jiraReleasenotes from '../src/jira-releasenotes.js';

vi.mock('@actions/core');
vi.mock('../src/jira-releasenotes.js');
vi.mock('../../../utils/src/index.js', () => ({
  checkEnv: vi.fn(),
}));

// Import after mocking
const { checkEnv } = await import('../../../utils/src/index.js');

describe('jira-releasenotes action', () => {
  const mockProtocol = 'https';
  const mockHost = 'jira.example.com';
  const mockProjectKey = 'TEST';
  const mockReleaseNoteField = 'Release Notes';
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      JIRA_USERNAME: 'test-user',
      JIRA_PASSWORD: 'test-password',
    };
    core.getInput.mockImplementation((name) => {
      if (name === 'jira-protocol') return mockProtocol;
      if (name === 'jira-host') return mockHost;
      if (name === 'jira-project') return mockProjectKey;
      if (name === 'field-releasenote') return mockReleaseNoteField;
      return '';
    });
    core.error.mockImplementation(() => {});
    jiraReleasenotes.createReleaseNotes.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  test('should get all required inputs', async () => {
    await action();

    expect(core.getInput).toHaveBeenCalledWith('jira-protocol', {
      required: true,
    });
    expect(core.getInput).toHaveBeenCalledWith('jira-host', {
      required: true,
    });
    expect(core.getInput).toHaveBeenCalledWith('jira-project', {
      required: true,
    });
    expect(core.getInput).toHaveBeenCalledWith('field-releasenote', {
      required: true,
    });
  });

  test('should call createReleaseNotes with correct parameters', async () => {
    await action();

    expect(jiraReleasenotes.createReleaseNotes).toHaveBeenCalledWith({
      protocol: mockProtocol,
      host: mockHost,
      projectKey: mockProjectKey,
      releaseNoteField: mockReleaseNoteField,
    });
  });

  test('should handle successful release notes creation', async () => {
    jiraReleasenotes.createReleaseNotes.mockResolvedValue({
      updated: ['TEST-123', 'TEST-456'],
    });

    await action();

    expect(jiraReleasenotes.createReleaseNotes).toHaveBeenCalled();
    expect(core.error).not.toHaveBeenCalled();
  });

  test('should handle errors from createReleaseNotes', async () => {
    const errorMessage = 'Failed to connect to JIRA';
    jiraReleasenotes.createReleaseNotes.mockRejectedValue(
      new Error(errorMessage),
    );

    await action();

    expect(jiraReleasenotes.createReleaseNotes).toHaveBeenCalled();
    expect(core.error).toHaveBeenCalledWith(
      `Failed to create release notes. Reason: ${errorMessage}`,
    );
  });

  test('should handle authentication errors', async () => {
    const authError = new Error('Authentication failed');
    jiraReleasenotes.createReleaseNotes.mockRejectedValue(authError);

    await action();

    expect(core.error).toHaveBeenCalledWith(
      'Failed to create release notes. Reason: Authentication failed',
    );
  });

  test('should handle network errors', async () => {
    const networkError = new Error('ECONNREFUSED');
    jiraReleasenotes.createReleaseNotes.mockRejectedValue(networkError);

    await action();

    expect(core.error).toHaveBeenCalledWith(
      'Failed to create release notes. Reason: ECONNREFUSED',
    );
  });

  test('should pass all inputs to createReleaseNotes in correct order', async () => {
    const customProtocol = 'http';
    const customHost = 'custom-jira.com';
    const customProjectKey = 'CUSTOM';
    const customField = 'Custom Release Notes';

    core.getInput.mockImplementation((name) => {
      if (name === 'jira-protocol') return customProtocol;
      if (name === 'jira-host') return customHost;
      if (name === 'jira-project') return customProjectKey;
      if (name === 'field-releasenote') return customField;
      return '';
    });

    await action();

    expect(jiraReleasenotes.createReleaseNotes).toHaveBeenCalledWith({
      protocol: customProtocol,
      host: customHost,
      projectKey: customProjectKey,
      releaseNoteField: customField,
    });
  });

  test('should handle empty error message gracefully', async () => {
    jiraReleasenotes.createReleaseNotes.mockRejectedValue(new Error(''));

    await action();

    expect(core.error).toHaveBeenCalledWith(
      'Failed to create release notes. Reason: ',
    );
  });

  test('should complete action flow from start to finish', async () => {
    await action();

    // Verify the complete flow
    expect(core.getInput).toHaveBeenCalledTimes(4);
    expect(jiraReleasenotes.createReleaseNotes).toHaveBeenCalledTimes(1);
    expect(core.error).not.toHaveBeenCalled();
  });
});
