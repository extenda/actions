jest.mock('@actions/core');
jest.mock('@actions/exec');

const exec = require('@actions/exec');
const deployDocumentation = require('../src/redoc');


describe('Run redoc deploy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    await deployDocumentation();

    expect(exec.exec).toHaveBeenCalledTimes(6);
  });
});
