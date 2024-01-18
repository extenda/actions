jest.mock('@actions/core');

const core = require('@actions/core');
const action = require('../src/index');

describe('run push policy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    await action();
    expect(core.warning).toHaveBeenCalledWith(expect.any(String));
  });
});
