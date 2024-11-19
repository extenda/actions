const core = require('@actions/core');
const fetchMock = require('fetch-mock').default;
const { getOctokit, getPullRequest, commitFiles } = require('../src/github');
const github = require('@actions/github');

jest.mock('@actions/core');

const orgEnv = process.env;
const orgRef = github.context.ref;

const pullRequestData = {
  head: { ref: 'refs/heads/feat/my-branch' },
  base: { ref: 'refs/heads/master' },
  number: 1,
};

const responseHeaders = {
  'x-github-media-type': 'github.v3; format=json',
  'content-type': 'application/json; charset=utf-8',
};

beforeEach(() => {
  process.env = {
    ...orgEnv,
    GITHUB_REPOSITORY: 'extenda/actions',
    GITHUB_REF: 'refs/heads/my-branch',
  };
  // Mock the @actions/github context.
  github.context.ref = 'refs/heads/my-branch';
  fetchMock.mockGlobal();
});

afterEach(() => {
  jest.resetAllMocks();
  process.env = orgEnv;
  github.context.ref = orgRef;
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

test('It can get pull_request', async () => {
  fetchMock.get(
    'https://api.github.com/repos/extenda/actions/pulls?head=extenda%3Amy-branch&state=open',
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
  await commitFiles(octokit, pullRequestData, [
    {
      path: 'qodana.yaml',
      content: '',
    },
  ]);
  expect(fetchMock.callHistory.callLogs).toHaveLength(3);
});
