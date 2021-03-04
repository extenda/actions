const createVariables = require('../src/env-vars');

describe('env-vars', () => {
  test('It creates variables', () => {
    const variables = createVariables(
      'test-staging-project',
      'eu.gcr.io/extenda/test:v1.0.0',
      'testrunner',
      'SE',
    );
    expect(variables).toEqual({
      NAMESPACE: 'txengine-testrunner-se',
      CONTAINER_IMAGE: 'eu.gcr.io/extenda/test:v1.0.0',
      TENANT_NAME: 'testrunner',
      POSTGRES_IP: 'sm://test-staging-project/testrunner_postgresql_private_address',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'sm://test-staging-project/testrunner_postgresql_master_password',
      SERVICE_PROJECT_ID: 'test-staging-project',
      SERVICE_ENVIRONMENT: 'staging',
    });
  });

  test('It can handle optional country code', () => {
    const variables = createVariables(
      'test-project',
      'eu.gcr.io/extenda/test:v1.0.0',
      'testrunner',
      '',
    );

    expect(variables).toMatchObject({
      NAMESPACE: 'txengine-testrunner',
      SERVICE_ENVIRONMENT: 'prod',
    });
  });
});
