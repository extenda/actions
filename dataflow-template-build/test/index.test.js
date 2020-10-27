jest.mock('@actions/core');
jest.mock('../src/dataflow-build');
jest.mock('../../setup-gcloud/src/setup-gcloud');

const core = require('@actions/core');
const action = require('../src/index');

describe('Dataflow Build Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('gs://test/dataflow/template.json')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('JAVA');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(5);
  });
});
