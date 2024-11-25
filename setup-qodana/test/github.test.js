const core = require('@actions/core');
const exec = require('@actions/exec');
const fetchMock = require('fetch-mock').default;
const {
  getOctokit,
  getQodanaChecks,
  getDefaultBranch,
  getCurrentBranch,
  getPullRequest,
  isFeatureBranch,
  commitFiles,
  getQodanaPrSha,
} = require('../src/github');
const github = require('@actions/github');

jest.mock('@actions/core');
jest.mock('@actions/exec');

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

test('It can get the default branch', async () => {
  fetchMock.get('https://api.github.com/repos/extenda/actions', {
    status: 200,
    body: JSON.stringify({ default_branch: 'master' }, null, 0),
    headers: responseHeaders,
  });
  const octokit = github.getOctokit('pat-token', { request: fetchMock });
  const result = await getDefaultBranch(octokit);
  expect(result).toEqual('master');
  expect(fetchMock.callHistory.callLogs).toHaveLength(1);
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

test('It can detect a pull_request', async () => {
  const pullRequestData = {
    head: { ref: 'refs/heads/feat/my-branch' },
    base: { ref: 'refs/heads/master' },
    number: 1,
  };
  fetchMock.get(
    'https://api.github.com/repos/extenda/actions/pulls?head=extenda%3Afeat%2Fmy-branch&state=open',
    {
      status: 200,
      body: JSON.stringify([pullRequestData], null, 0),
      headers: responseHeaders,
    },
  );

  const octokit = github.getOctokit('pat-token', { request: fetchMock });
  const pullRequest = await getPullRequest(octokit);
  expect(pullRequest).toEqual(pullRequestData);
  expect(fetchMock.callHistory.callLogs).toHaveLength(1);
});

test('It can get Qodana Checks', async () => {
  fetchMock.get(
    'https://api.github.com/repos/extenda/actions/commits/abc123/check-runs',
    {
      status: 200,
      body: JSON.stringify(
        {
          total_count: 2,
          check_runs: [
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
        },
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

test('It can get Qodana SHA on PR', async () => {
  github.context.ref = 'refs/heads/feat/my-branch2';
  fetchMock.get(
    'https://api.github.com/repos/extenda/actions/pulls?head=extenda%3Afeat%2Fmy-branch2&state=open',
    {
      status: 200,
      body: JSON.stringify(
        [
          {
            head: { sha: 'ddd111', ref: 'refs/heads/feat/my-branch2' },
            base: { sha: 'abc123', ref: 'refs/heads/master' },
            number: 2,
          },
        ],
        null,
        0,
      ),
      headers: responseHeaders,
    },
  );
  fetchMock.get('https://api.github.com/repos/extenda/actions', {
    status: 200,
    body: JSON.stringify({ default_branch: 'master' }, null, 0),
    headers: responseHeaders,
  });

  exec.getExecOutput.mockResolvedValueOnce({ exitCode: 0, stdout: 'abc123' });

  const octokit = github.getOctokit('pat-token', { request: fetchMock });
  const result = await getQodanaPrSha(octokit);
  expect(result).toEqual({
    prMode: true,
    sha: 'abc123',
    issueNumber: 2,
  });
  expect(fetchMock.callHistory.callLogs).toHaveLength(2);
  expect(exec.getExecOutput).toHaveBeenCalledWith(
    'git',
    ['merge-base', 'abc123', 'ddd111'],
    { ignoreReturnCode: true },
  );
});

test('It skips Qodana SHA on default branch', async () => {
  process.env.GITHUB_REF = github.context.ref = 'refs/heads/master';
  fetchMock.get('https://api.github.com/repos/extenda/actions', {
    status: 200,
    body: JSON.stringify({ default_branch: 'master' }, null, 0),
    headers: responseHeaders,
  });
  const octokit = github.getOctokit('pat-token', { request: fetchMock });
  const result = await getQodanaPrSha(octokit);
  expect(result).toEqual({
    prMode: false,
    sha: '',
    issueNumber: -1,
  });
  expect(fetchMock.callHistory.callLogs).toHaveLength(1);
});
