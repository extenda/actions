const exec = require('@actions/exec');
const { loadTool } = require('../../utils');
const kustomize = require('../src/kustomize');

jest.mock('@actions/exec');
jest.mock('../../utils', () => ({
  loadTool: jest.fn(),
}));

describe('Run Kustomize', () => {
  beforeEach(() => {
    process.env.GITHUB_WORKSPACE = 'extenda/test-repo';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run Kustomize with args', async () => {
    exec.exec.mockResolvedValueOnce(0);
    const tool = 'kustomize';
    loadTool.mockResolvedValueOnce(tool);

    const args = ['edit', 'set'];
    await kustomize(args);

    expect(exec.exec).toHaveBeenCalledWith(tool, args, expect.objectContaining({ cwd: 'kustomize' }));
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
