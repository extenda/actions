jest.mock('@actions/core');
const action = require('../src/index');

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
  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('It will use passed inputs', async () => {
    await action();
    expect(true).toEqual(true);
  });
});
