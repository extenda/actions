const core = require('@actions/core');
const action = require('../src/index');
const baseline = require('../src/baseline');
const createProject = require('../src/create-project');
const coverageDirectory = require('../src/coverage-dir');
const { autoDiscover } = require('../src/auto-discover');
const qodanaSanity = require('../src/qodana-sanity');

jest.mock('@actions/core');
jest.mock('../src/baseline');
jest.mock('../src/create-project');
jest.mock('../src/coverage-dir');
jest.mock('../src/qodana-sanity');
jest.mock('../src/auto-discover');

const {
  projectType: { NODE },
} = jest.requireActual('../src/auto-discover');

describe('setup-qodana', () => {
  beforeEach(() => {
    core.getInput.mockReturnValueOnce('token').mockReturnValueOnce('team');
    createProject.mockResolvedValueOnce('project-token');
    autoDiscover.mockReturnValueOnce(NODE);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can setup qodana with baseline and coverage', async () => {
    core.getInput.mockReturnValueOnce('');
    baseline.mockReturnValueOnce('baseline.sarif.json');
    coverageDirectory.mockReturnValueOnce('coverage');
    qodanaSanity.mockReturnValueOnce(true);
    await action();
    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(createProject).toHaveBeenCalledWith('token', 'team');
    expect(autoDiscover).toHaveBeenCalledWith('.');
    expect(qodanaSanity).toHaveBeenCalledWith(NODE, '.');
    expect(core.setOutput).toHaveBeenCalledTimes(4);
    expect(core.setOutput).toHaveBeenCalledWith(
      'project-token',
      'project-token',
    );
    expect(core.setSecret).toHaveBeenLastCalledWith('project-token');
    expect(core.setOutput).toHaveBeenCalledWith(
      'baseline',
      'baseline.sarif.json',
    );
    expect(core.setOutput).toHaveBeenCalledWith('coverage-dir', 'coverage');
    expect(core.setOutput).toHaveBeenLastCalledWith(
      'args',
      '--baseline,baseline.sarif.json,--coverage-dir,coverage',
    );
  });
  test('It can setup qodana without baseline and coverage', async () => {
    core.getInput.mockReturnValueOnce('subdir');
    baseline.mockReturnValueOnce('');
    coverageDirectory.mockReturnValueOnce('');
    qodanaSanity.mockReturnValueOnce(true);
    await action();
    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(createProject).toHaveBeenCalledWith('token', 'team');
    expect(autoDiscover).toHaveBeenCalledWith('subdir');
    expect(qodanaSanity).toHaveBeenCalledWith(NODE, 'subdir');
    expect(core.setOutput).toHaveBeenCalledTimes(2);
    expect(core.setOutput).toHaveBeenLastCalledWith(
      'args',
      '--project-dir,subdir',
    );
  });
  test('It will fail on sanity check failures', async () => {
    baseline.mockReturnValueOnce('');
    coverageDirectory.mockReturnValueOnce('');
    qodanaSanity.mockReturnValueOnce(false);
    await action();
    expect(core.setFailed).toHaveBeenCalled();
  });
});
