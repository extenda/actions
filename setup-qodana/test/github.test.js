const core = require('@actions/core');
const fetchMock = require('fetch-mock').default;
const {
  getOctokit,
  getQodanaChecks,
  getCurrentBranch,
  isFeatureBranch,
  commitFiles,
} = require('../src/github');
const github = require('@actions/github');

jest.mock('@actions/core');

const orgEnv = process.env;
const orgRef = github.context.ref;
const orgSha = github.context.sha;

const responseHeaders = {
  'x-github-media-type': 'github.v3; format=json',
  'content-type': 'application/json; charset=utf-8',
};

beforeEach(() => {
  process.env = {
    ...orgEnv,
    GITHUB_SHA: 'abc123',
    GITHUB_REPOSITORY: 'extenda/actions',
    GITHUB_REF: 'refs/heads/feat/my-branch',
  };
  github.context.ref = 'refs/heads/feat/my-branch';
  github.context.sha = 'abc123';
  fetchMock.mockGlobal();
});

afterEach(() => {
  jest.resetAllMocks();
  process.env = orgEnv;
  github.context.ref = orgRef;
  github.context.sha = orgSha;
  fetchMock.unmockGlobal();
  fetchMock.clearHistory();
});

test('It can create Octokit', () => {
  core.getInput.mockReturnValueOnce('pat-token');
  const octokit = getOctokit();
  expect(octokit).toMatchObject(
    expect.objectContaining({
      rest: expect.anything(),
    }),
  );
  expect(core.getInput).toHaveBeenCalled();
});

test('It can return current branch', () => {
  expect(getCurrentBranch()).toEqual('feat/my-branch');
});

test('It can compare refs/pulls with default branch', async () => {
  process.env.GITHUB_REF = github.context.ref = 'refs/pulls/1/merge';
  const octokit = github.getOctokit('pat-token', { request: fetchMock });
  const result = await isFeatureBranch(octokit);
  expect(result).toEqual(false);
});

test('It can detect a feature branch', async () => {
  fetchMock.get('https://api.github.com/repos/extenda/actions', {
    status: 200,
    body: JSON.stringify({ default_branch: 'master' }, null, 0),
    headers: responseHeaders,
  });
  const octokit = github.getOctokit('pat-token', { request: fetchMock });
  const result = await isFeatureBranch(octokit);
  expect(result).toEqual(true);
  expect(fetchMock.callHistory.callLogs).toHaveLength(1);
});

test('It can get Qodana Checks', async () => {
  fetchMock.get(
    'https://api.github.com/repos/extenda/actions/commits/abc123/check-runs',
    {
      status: 200,
      body: JSON.stringify(
        [
          {
            name: 'pre-commit',
            status: 'completed',
            conclusion: 'success',
          },
          {
            name: 'Qodana for JVM',
            status: 'completed',
            conclusion: 'failure',
          },
        ],
        null,
        0,
      ),
      headers: responseHeaders,
    },
  );
  const octokit = github.getOctokit('pat-token', { request: fetchMock });
  const result = await getQodanaChecks(octokit);
  expect(result).toEqual([
    {
      name: 'Qodana for JVM',
      conclusion: 'failure',
      success: false,
    },
  ]);
  expect(fetchMock.callHistory.callLogs).toHaveLength(1);
});

test('It can detect the default branch', async () => {
  process.env.GITHUB_REF = github.context.ref = 'refs/heads/master';
  fetchMock.get('https://api.github.com/repos/extenda/actions', {
    status: 200,
    body: JSON.stringify({ default_branch: 'master' }, null, 0),
    headers: responseHeaders,
  });
  const octokit = github.getOctokit('pat-token', { request: fetchMock });
  const result = await isFeatureBranch(octokit);
  expect(result).toEqual(false);
  expect(fetchMock.callHistory.callLogs).toHaveLength(1);
});

test('It can commit files', async () => {
  fetchMock
    .post('https://api.github.com/repos/extenda/actions/git/trees', {
      status: 201,
      body: JSON.stringify({ sha: 'abc123' }, null, 0),
      headers: responseHeaders,
    })
    .post('https://api.github.com/repos/extenda/actions/git/commits', {
      status: 201,
      body: JSON.stringify({ sha: 'def456' }, null, 0),
      headers: responseHeaders,
    })
    .patch(
      'https://api.github.com/repos/extenda/actions/git/refs/refs%2Fheads%2Ffeat%2Fmy-branch',
      {
        status: 200,
        body: JSON.stringify({ ref: 'refs/heads/my-branch' }, null, 0),
        headers: responseHeaders,
      },
    );

  const octokit = github.getOctokit('pat-token', { request: fetchMock });
  await commitFiles(octokit, [
    {
      path: 'qodana.yaml',
      content: '',
    },
  ]);
  expect(fetchMock.callHistory.callLogs).toHaveLength(3);
});
