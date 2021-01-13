const createEnvArgs = require('../src/environment-args');

describe('Environment args', () => {
  test('It can build a list of arguments', () => {
    const args = createEnvArgs({
      KEY_1: 'value1',
      KEY_2: 'value2',
    }, 'test-staging-project');

    expect(args).toEqual('KEY_1=value1,KEY_2=value2,SERVICE_PROJECT_ID=test-staging-project,SERVICE_ENVIRONMENT=staging');
  });

  test('It can update secret manager URLs', () => {
    const args = createEnvArgs({
      KEY_1: 'value1',
      KEY_2: 'sm://*/my-secret',
      KEY_3: 'sm://other/shared-secret',
    }, 'test-prod-project');

    expect(args).toEqual('KEY_1=value1,KEY_2=sm://test-prod-project/my-secret,KEY_3=sm://other/shared-secret,SERVICE_PROJECT_ID=test-prod-project,SERVICE_ENVIRONMENT=prod');
  });
});
