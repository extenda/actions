const createEnvArgs = require('../src/environment-args');

describe('Environment args', () => {
  test('It can build a list of arguments', () => {
    const args = createEnvArgs({
      KEY_1: 'value1',
      KEY_2: 'value2',
    }, 'test-project');

    expect(args).toEqual('KEY_1="value1",KEY_2="value2"');
  });

  test('It can update secret manager URLs', () => {
    const args = createEnvArgs({
      KEY_1: 'value1',
      KEY_2: 'sm://*/my-secret',
      KEY_3: 'sm://other/shared-secret',
    }, 'test-project');

    expect(args).toEqual('KEY_1="value1",KEY_2="sm://test-project/my-secret",KEY_3="sm://other/shared-secret"');
  });
});
