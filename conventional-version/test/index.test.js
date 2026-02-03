jest.mock('@actions/core');
jest.mock('../../utils/src/branch-info.js');
import { getBranchNameSemver } from '../../utils/src/branch-info.js';
import action from '../src/index.js';

const orgEnv = process.env;

describe('Get latest version', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      GITHUB_REF: 'refs/heads/feature-branch-1',
      GITHUB_HEAD_REF: 'refs/heads/feature-branch-1',
      GITHUB_SHA: '300ef1336f23588c9f4dc347989006033cea780d',
    };
    getBranchNameSemver.mockResolvedValueOnce('refsheadsfeaturebranch1');
  });
  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('Get the version ', async () => {
    await action();
    expect(getBranchNameSemver).toHaveBeenCalledWith(
      'refs/heads/feature-branch-1',
    );
  });
});
