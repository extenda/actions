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

import core from '@actions/core';

import action from '../src/index';

let orgEnv;

describe('conventional-release', () => {
  beforeAll(() => {
    orgEnv = process.env;
  });
  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'github-token';
    core.getInput.mockReturnValueOnce('extenda/test-repo');
    core.getBooleanInput = jest.fn().mockImplementation((name) => {
      if (name === 'pre-release') return false;
      if (name === 'make-latest') return true;
      return false;
    });
    mockTag.mockReturnValueOnce({
      tagName: 'extenda/test-repo',
      version: '0.0.1',
      changelog: {
        html_url: 'extenda.io',
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('It can create a release', async () => {
    await action();

    expect(mockRelease).toHaveBeenCalledWith({
      owner: 'extenda',
      repo: 'test-repo',
      name: 'Release 0.0.1',
      body: {
        html_url: 'extenda.io',
      },
      tag_name: 'extenda/test-repo',
      prerelease: false,
      make_latest: 'true',
    });
  });

  test('It fails if GITHUB_TOKEN is missing', async () => {
    delete process.env.GITHUB_TOKEN;
    await action();
    expect(core.setFailed).toHaveBeenCalled();
  });

  test('It sets outputs after successful release', async () => {
    const releaseData = {
      id: 'release-123',
      html_url: 'https://github.com/extenda/test-repo/releases/tag/v1.0.0',
    };
    mockRelease.mockResolvedValueOnce({ data: releaseData });

    await action();

    expect(core.setOutput).toHaveBeenCalledWith('version', '0.0.1');
    expect(core.setOutput).toHaveBeenCalledWith(
      'release-tag',
      'extenda/test-repo',
    );
  });

  test('It can use a custom name prefix', async () => {
    core.getInput.mockReturnValueOnce('Extenda Actions');

    await action();

    expect(mockRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Extenda Actions 0.0.1',
      }),
    );
  });

  test('It can create a non-latest release', async () => {
    core.getBooleanInput = jest.fn((name) => {
      if (name === 'make-latest') return false;
    });

    await action();

    expect(mockRelease).toHaveBeenCalledWith(
      expect.objectContaining({ make_latest: 'false' }),
    );
  });

  test('It can create a pre-release', async () => {
    core.getBooleanInput = jest.fn((name) => {
      if (name === 'pre-release') return true;
    });

    await action();

    expect(mockRelease).toHaveBeenCalledWith(
      expect.objectContaining({ prerelease: true }),
    );
  });
});
