jest.mock('@actions/core');
jest.mock('../src/dataflow-build');
jest.mock('../../setup-gcloud/src/setup-gcloud');

const core = require('@actions/core');
const action = require('../src/index');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const dataflowBuild = require('../src/dataflow-build');

describe('Dataflow Build Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    setupGcloud.mockReturnValueOnce('test-project');
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('gs://test/dataflow/template.json')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('JAVA')
      .mockReturnValueOnce('metadata.json');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(5);
    expect(dataflowBuild).toHaveBeenCalledWith(
      'metadata.json',
      'gs://test/dataflow/template.json',
      'JAVA',
      'gcr.io/project/image:tag',
    );
  });

  test('It can run the action without optional metadata tag', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('gs://test/dataflow/template.json')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('JAVA');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(5);
    expect(dataflowBuild).toHaveBeenCalledWith(
      'JAVA',
      'gs://test/dataflow/template.json',
      'gcr.io/project/image:tag',
      '',
    );
  });
});
