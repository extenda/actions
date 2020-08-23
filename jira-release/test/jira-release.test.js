const mockGetProject = jest.fn();
const mockGetVersions = jest.fn();
const mockCreateVersion = jest.fn();
const mockUpdateVersion = jest.fn();
const mockUpdateIssue = jest.fn();

jest.mock('jira-client', () => function JiraClient() {
  return {
    getProject: mockGetProject,
    getVersions: mockGetVersions,
    createVersion: mockCreateVersion,
    updateVersion: mockUpdateVersion,
    updateIssue: mockUpdateIssue,
  };
});

jest.mock('../../jira-releasenotes/src/jira-releasenotes', () => ({
  findJiraChanges: () => ({
    'TEST-1': {},
    'TEST-2': {},
  }),
}));

const { createJiraRelease } = require('../src/jira-release');

const mockVersion = {
  self: 'https://jiratest.extendaretail.com/rest/api/2/version/19202',
  id: '19202',
  description: 'Created by GitHub Actions.',
  name: 'TEST 2.0.0',
  archived: false,
  released: false,
  releaseDate: '2020-04-14',
  overdue: false,
  userReleaseDate: '2020-04-14',
  projectId: 12073,
};

const args = {
  protocol: 'https',
  host: 'jiratest.extendaretail.com',
  projectKey: 'TEST',
  component: '',
  version: '2.0.0',
};

describe('JIRA release', () => {
  beforeEach(() => {
    mockGetProject.mockResolvedValueOnce({
      id: 12073,
      key: 'TEST',
      components: [{
        self: 'https://jiratest.extendaretail.com/rest/api/2/component/17744',
        id: '17744',
        name: 'Test',
        isAssigneeTypeValid: false,
      },
      {
        self: 'https://jiratest.extendaretail.com/rest/api/2/component/15845',
        id: '15845',
        name: 'Test 2',
        isAssigneeTypeValid: false,
      }],
    });
    mockUpdateIssue.mockResolvedValue({});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It fails for illegal project', async () => {
    mockGetProject.mockReset();
    mockGetProject.mockRejectedValueOnce(new Error('No project found'));
    await expect(createJiraRelease({
      ...args,
      projectKey: 'FAIL',
    })).rejects.toEqual(new Error('No project found'));
    expect(mockGetProject).toHaveBeenCalled();
  });

  test('It fails for illegal component', async () => {
    await expect(createJiraRelease({
      ...args,
      component: 'Fail',
    })).rejects.toEqual(new Error("'Fail' is not a valid JIRA component in project 'TEST'"));
    expect(mockGetProject).toHaveBeenCalled();
  });

  test('It fails for invalid semver version', async () => {
    await expect(createJiraRelease({
      ...args,
      version: 'customprefix-2.0.0',
    })).rejects.toEqual(new Error("'customprefix-2.0.0' is not a semantic version"));
  });

  test('It can reuse existing release', async () => {
    mockGetVersions.mockResolvedValueOnce([mockVersion]);
    mockUpdateVersion.mockResolvedValueOnce({});
    await createJiraRelease(args);
    expect(mockGetProject).toHaveBeenCalled();
    expect(mockGetVersions).toHaveBeenCalledWith('TEST');
    expect(mockCreateVersion).not.toHaveBeenCalled();
    expect(mockUpdateVersion).toHaveBeenCalled();
  });

  test('It can create a new release from valid semver tag', async () => {
    mockGetVersions.mockResolvedValueOnce([]);
    mockCreateVersion.mockResolvedValueOnce(mockVersion);
    mockUpdateVersion.mockResolvedValueOnce({});
    const releaseName = await createJiraRelease({
      ...args,
      version: 'v2.0.0',
    });
    expect(releaseName).toEqual('TEST 2.0.0');
    expect(mockCreateVersion).toHaveBeenCalled();
    expect(mockUpdateVersion).toHaveBeenCalled();
  });

  test('It can create release with component', async () => {
    mockGetVersions.mockResolvedValueOnce([]);
    mockCreateVersion.mockResolvedValueOnce(mockVersion);
    mockUpdateVersion.mockResolvedValueOnce({});
    const releaseName = await createJiraRelease({
      ...args,
      component: 'Test',
    });
    expect(releaseName).toEqual('TEST (Test) 2.0.0');
    expect(mockCreateVersion).toHaveBeenCalled();
    expect(mockUpdateVersion).toHaveBeenCalled();
  });

  test('It succeeds for already released version', async () => {
    mockGetVersions.mockResolvedValueOnce([{
      ...mockVersion,
      released: true,
    }]);
    const releaseName = await createJiraRelease(args);
    expect(releaseName).toEqual('TEST 2.0.0');
    expect(mockUpdateVersion).not.toHaveBeenCalled();
  });

  test('It logs, but succeeds if version can\'t be released', async () => {
    mockGetVersions.mockResolvedValueOnce([]);
    mockCreateVersion.mockResolvedValueOnce(mockVersion);
    mockUpdateVersion.mockRejectedValueOnce(new Error('Unable to release'));
    const releaseName = await createJiraRelease(args);
    expect(releaseName).toEqual('TEST 2.0.0');
  });
});
