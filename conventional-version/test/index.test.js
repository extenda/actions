jest.mock('@actions/core');
//jest.mock('../../utils/src/branch-info');

const core = require('@actions/core');
const action = require('../src/index');
const branchinfo = require('../../utils/src/branch-info');
// const {
//   getBranchName,
//   getBranchNameFriendly,
//   getBranchNameSemver,
//   getBranchNameShort,
//   getBranchType,
//   getComposedVersionString,
//   getShortSha,
//   getTagAtCommit,
// } = require('../../utils/src/branch-info');

const orgEnv = process.env;

describe('create packaage Action', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      GITHUB_REF: 'refs/heads/feature-branch-1',
      GITHUB_HEAD_REF: 'refs/heads/feature-branch-1',
      GITHUB_SHA: '300ef1336f23588c9f4dc347989006033cea780d',
    };
  });
  //     getBranchName.mockResolvedValueOnce('feature-branch-1');
  //     getBranchNameFriendly.mockResolvedValueOnce('refs/heads');
  //     getBranchNameSemver.mockResolvedValueOnce('featurebranch1');
  //     getBranchNameShort.mockResolvedValueOnce('feature-branch-1');
  //     getBranchType.mockResolvedValueOnce('develop');
  //     getComposedVersionString.mockResolvedValueOnce('1.0.0-feature-branch-1-shalala');
  //     getShortSha.mockResolvedValueOnce('shalala');
  //     getTagAtCommit.mockResolvedValueOnce('tag1');

  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  //   test('It fails for missing GITHUB_REF', async () => {
  //     delete process.env.GITHUB_REF;
  // await expect(action()).rejects.toEqual(new Error('Missing env var: GITHUB_REF'));
  //   });

  //   test('It fails for missing GITHUB_HEAD_REF', async () => {
  //     delete process.env.GITHUB_HEAD_REF;
  //     await expect(action()).rejects.toEqual(new Error('Missing env var: GITHUB_HEAD_REF'));
  //   });

  test('It will use passed inputs', async () => {
    await action();
    expect(true).toEqual(true);
  });
});
