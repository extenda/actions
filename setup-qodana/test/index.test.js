const core = require('@actions/core');
const action = require('../src/index');
const baseline = require('../src/baseline');
const createProject = require('../src/create-project');
const coverageDirectory = require('../src/coverage-dir');
const { autoDiscover } = require('../src/auto-discover');
const qodanaSanity = require('../src/qodana-sanity');
const github = require('../src/github');

jest.mock('@actions/core');
jest.mock('../src/baseline');
jest.mock('../src/create-project');
jest.mock('../src/coverage-dir');
jest.mock('../src/qodana-sanity');
jest.mock('../src/auto-discover');
jest.mock('../src/github');

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
    baseline.mockResolvedValueOnce('qodana.sarif.json');
    coverageDirectory.mockReturnValueOnce('coverage');
    qodanaSanity.mockReturnValueOnce({
      qodanaYamlFile: 'qodana.yaml',
      valid: true,
    });
    github.getQodanaPrSha.mockResolvedValueOnce({
      prMode: false,
      sha: '',
      issueNumber: -1,
    });
    await action();
    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(createProject).toHaveBeenCalledWith('token', 'team');
    expect(autoDiscover).toHaveBeenCalledWith('.');
    expect(qodanaSanity).toHaveBeenCalledWith(NODE, '.');
    expect(core.setOutput).toHaveBeenCalledTimes(5);
    expect(core.setOutput).toHaveBeenCalledWith(
      'project-token',
      'project-token',
    );
    expect(core.setSecret).toHaveBeenLastCalledWith('project-token');
    expect(core.setOutput).toHaveBeenCalledWith(
      'baseline',
      'qodana.sarif.json',
    );
    expect(core.setOutput).toHaveBeenCalledWith('coverage-dir', 'coverage');
    expect(core.setOutput).toHaveBeenLastCalledWith(
      'args',
      '--config,qodana.yaml,--baseline,qodana.sarif.json,--coverage-dir,coverage',
    );
    expect(core.setOutput).toHaveBeenCalledWith('pr-mode', 'false');
  });
  test('It can setup qodana without baseline and coverage', async () => {
    core.getInput.mockReturnValueOnce('subdir');
    baseline.mockResolvedValueOnce('');
    coverageDirectory.mockReturnValueOnce('');
    qodanaSanity.mockReturnValueOnce({
      qodanaYamlFile: 'qodana_recommended.yaml',
      valid: true,
    });
    github.getQodanaPrSha.mockResolvedValueOnce({
      prMode: true,
      sha: 'abc123',
      issueNumber: 1,
    });
    await action();
    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(createProject).toHaveBeenCalledWith('token', 'team');
    expect(autoDiscover).toHaveBeenCalledWith('subdir');
    expect(qodanaSanity).toHaveBeenCalledWith(NODE, 'subdir');
    expect(core.setOutput).toHaveBeenCalledTimes(3);
    expect(core.setOutput).toHaveBeenLastCalledWith(
      'args',
      '--project-dir,subdir,--config,qodana_recommended.yaml',
    );
    expect(core.setOutput).toHaveBeenCalledWith('pr-mode', 'true');
    expect(core.exportVariable).toHaveBeenCalledWith('QODANA_PR_SHA', 'abc123');
  });
  test('It will fail on sanity check failures', async () => {
    baseline.mockResolvedValueOnce('');
    coverageDirectory.mockReturnValueOnce('');
    qodanaSanity.mockReturnValueOnce({
      qodanaYamlFile: 'qodana.yaml',
      valid: false,
    });
    await action();
    expect(core.setFailed).toHaveBeenCalled();
  });
});
