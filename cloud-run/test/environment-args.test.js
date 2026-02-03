import createEnvArgs from '../src/environment-args';

describe('Environment args', () => {
  test('It can build a list of arguments', () => {
    const args = createEnvArgs(
      {
        KEY_1: 'value1',
        KEY_2: 'value2',
      },
      'test-staging-project',
      'testrunner:v1.5.0',
    );

    expect(args).toContain('KEY_1=value1,KEY_2=value2');
  });

  test('It populates default env variables', () => {
    const args = createEnvArgs(
      {
        KEY_1: 'value1',
        KEY_2: 'value2',
      },
      'test-staging-project',
      'testrunner:v1.5.0',
    );

    expect(args).toContain(
      'SERVICE_PROJECT_ID=test-staging-project,SERVICE_ENVIRONMENT=staging,SERVICE_CONTAINER_IMAGE=testrunner:v1.5.0',
    );
  });

  test('It can update secret manager URLs', () => {
    const args = createEnvArgs(
      {
        KEY_1: 'value1',
        KEY_2: 'sm://*/my-secret',
        KEY_3: 'sm://other/shared-secret',
      },
      'test-prod-project',
      'testrunner:v1.5.0',
    );

    expect(args).toContain(
      'KEY_2=sm://test-prod-project/my-secret,KEY_3=sm://other/shared-secret',
    );
  });
});
