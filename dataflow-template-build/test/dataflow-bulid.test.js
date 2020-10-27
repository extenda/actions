jest.mock('@actions/exec');
const exec = require('@actions/exec');
const dataflowBuild = require('../src/dataflow-build');

describe('Build Dataflow template', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Build template', async () => {
    dataflowBuild(
      'template-name',
      'gcr.io/test-project/my-service:tag',
      'metadata.json',
      'JAVA',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
