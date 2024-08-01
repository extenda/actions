jest.mock('@actions/core');
jest.mock('../../utils');

const mockTag = jest.fn();

jest.mock('../../utils/src/versions', () => ({
  tagReleaseVersion: mockTag,
  setTagPrefix: jest.fn(),
}));

const mockRelease = jest.fn();

jest.mock('@actions/github', () => ({
  getOctokit: () => ({
    rest: {
      repos: {
        createRelease: mockRelease,
      },
    },
  }),
  context: {
    repo: {
      owner: 'extenda',
      repo: 'test-repo',
    },
  },
}));

const core = require('@actions/core');
const action = require('../src/index');

let orgEnv;

describe('conventional-release', () => {
  beforeAll(() => {
    orgEnv = process.env;
  });
  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'github-token';
  });
  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('It can create a release', async () => {
    core.getInput.mockReturnValueOnce('extenda/test-repo');
    mockTag.mockReturnValueOnce({
      tagName: 'extenda/test-repo',
      version: '0.0.1',
      changelog: {
        html_url: 'extenda.io',
      },
    });

    await action();

    expect(mockRelease).toHaveBeenCalledWith({
      owner: 'extenda',
      repo: 'test-repo',
      name: 'Release 0.0.1',
      body: {
        html_url: 'extenda.io',
      },
      tag_name: 'extenda/test-repo',
    });
    expect(core.getInput).toHaveBeenCalledTimes(2);
  });

  test('It can use a custom name prefix', async () => {
    core.getInput
      .mockReturnValueOnce('extenda/test-repo')
      .mockReturnValueOnce('Extenda Actions');
    mockTag.mockReturnValueOnce({
      tagName: 'extenda/test-repo',
      version: '0.0.1',
      changelog: {
        html_url: 'extenda.io',
      },
    });

    await action();

    expect(mockRelease).toHaveBeenCalledWith({
      owner: 'extenda',
      repo: 'test-repo',
      name: 'Extenda Actions 0.0.1',
      body: {
        html_url: 'extenda.io',
      },
      tag_name: 'extenda/test-repo',
    });
    expect(core.getInput).toHaveBeenCalledTimes(2);
  });
});
