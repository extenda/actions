jest.mock('@actions/core');
jest.mock('../src/redoc');

const core = require('@actions/core');
const action = require('../src/index');
// const deployDocumentation = require('../src/redoc');

describe('Api documentation action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    // core.getInput.mockReturnValueOnce('openapi.yaml')
    //   .mockReturnValueOnce('api-name')
    //   .mockReturnValueOnce('v1.0.0')
    //   .mockReturnValueOnce('system-name')
    //   .mockReturnValueOnce('gs://bucket');
    // deployDocumentation.mockResolvedValueOnce({});
    await action();

    expect(core.info).toHaveBeenCalledTimes(3);
    // expect(deployDocumentation).toHaveBeenCalledWith(
    //   'openapi.yaml',
    //   'api-name',
    //   'v1.0.0',
    //   'gs://bucket',
    //   'system-name',
    // );
  });
});
