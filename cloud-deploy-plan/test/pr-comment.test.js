const { getPullRequestNumber, postComment } = require('../src/pr-comment');
const { getPullRequestInfo } = require('../../utils/src/pull-request-info');

const mockCreateComment = jest.fn();
const mockListComments = jest.fn();
const mockUpdateComment = jest.fn();

jest.mock('../../utils/src/pull-request-info');
jest.mock('@actions/github', () => ({
  getOctokit: () => ({
    rest: {
      issues: {
        createComment: mockCreateComment,
        listComments: mockListComments,
        updateComment: mockUpdateComment,
      },
    },
  }),
  context: {
    repo: {
      owner: 'extenda',
      repo: 'actions',
    },
  },
}));

afterEach(() => {
  jest.resetAllMocks();
});

test('It can fetch pull request number', async () => {
  getPullRequestInfo.mockResolvedValueOnce({ number: 1 });
  const issueId = await getPullRequestNumber('token');
  expect(issueId).toEqual(1);
});

test('It returns NaN for missing PR', async () => {
  getPullRequestInfo.mockResolvedValueOnce(null);
  const issueId = await getPullRequestNumber('token');
  expect(issueId).toEqual(NaN);
});

test('It can create a comment', async () => {
  mockListComments.mockResolvedValueOnce({ data: [] });
  await postComment('token', 1, 'test comment');
  expect(mockCreateComment).toHaveBeenCalledWith({
    owner: 'extenda',
    repo: 'actions',
    issue_number: 1,
    body: expect.stringContaining(
      'test comment\n\n<i>Posted by extenda/actions/cloud-deploy-plan</i>',
    ),
  });
  expect(mockUpdateComment).not.toHaveBeenCalled();
});

test('It can update a comment', async () => {
  mockListComments.mockResolvedValueOnce({
    data: [
      { id: 1, body: 'Random comment' },
      {
        id: 2,
        body: 'Existing comment\n\n<i>Posted by extenda/actions/cloud-deploy-plan</i>',
      },
    ],
  });
  await postComment('token', 1, 'Updated');
  expect(mockUpdateComment).toHaveBeenCalledWith({
    owner: 'extenda',
    repo: 'actions',
    comment_id: 2,
    body: expect.stringContaining(
      'Updated\n\n<i>Posted by extenda/actions/cloud-deploy-plan</i>',
    ),
  });
  expect(mockCreateComment).not.toHaveBeenCalled();
});
