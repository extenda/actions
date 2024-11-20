const path = require('path');
const core = require('@actions/core');
const post = require('../src/post');
const github = require('../src/github');
const { root, createFiles, removeFiles } = require('./test-files');

jest.mock('@actions/core');
jest.mock('../src/github');

afterEach(() => {
  removeFiles();
  jest.resetAllMocks();
});

describe('Post Action', () => {
  test('It commits generated files', async () => {
    createFiles(['qodana.yaml', 'qodana.sarif.json']);

    core.getInput.mockReturnValueOnce('failure');
    core.getState.mockReturnValueOnce(path.resolve(root, 'qodana.yaml'));

    github.getOctokit.mockReturnValueOnce({});
    github.isFeatureBranch.mockResolvedValueOnce(true);
    github.commitFiles.mockResolvedValueOnce({});

    const result = await post();
    expect(result).toEqual(0);

    expect(github.commitFiles).toHaveBeenCalledWith(expect.anything(), [
      { path: 'qodana.yaml', content: '' },
      { path: 'qodana.sarif.json', content: '' },
    ]);
  });

  test('It does not commit if not generated', async () => {
    createFiles(['qodana.yaml']);
    core.getInput.mockReturnValueOnce('success');

    github.getOctokit.mockReturnValueOnce({});
    github.isFeatureBranch.mockResolvedValueOnce(true);
    github.commitFiles.mockResolvedValueOnce({});

    const result = await post();
    expect(result).toEqual(0);

    expect(github.commitFiles).not.toHaveBeenCalled();
  });

  test('It does not commit if not feature branch', async () => {
    createFiles(['qodana.yaml']);
    core.getInput.mockReturnValueOnce('success');
    core.getState.mockReturnValueOnce(path.resolve(root, 'qodana.yaml'));

    github.getOctokit.mockReturnValueOnce({});
    github.isFeatureBranch.mockResolvedValueOnce(false);
    github.commitFiles.mockResolvedValueOnce({});

    const result = await post();
    expect(result).toEqual(0);

    expect(github.commitFiles).not.toHaveBeenCalled();
  });

  test('It handles commit error', async () => {
    createFiles(['qodana.yaml', 'qodana.sarif.json']);

    core.getInput.mockReturnValueOnce('failure');
    core.getState.mockReturnValueOnce(path.resolve(root, 'qodana.yaml'));

    github.getOctokit.mockReturnValueOnce({});
    github.isFeatureBranch.mockResolvedValueOnce(true);
    github.commitFiles.mockRejectedValueOnce(new Error('TEST'));

    const result = await post();
    expect(result).toEqual(1);
  });
});
