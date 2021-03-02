const createVariables = require('../src/env-vars');

describe('env-vars', () => {
  test('It creates variables', () => {
    const variables = createVariables(
      'test-project',
      'eu.gcr.io/extenda/test:v1.0.0',
      'testrunner',
      'SE',
    );
    expect(variables).toEqual({
      NAMESPACE: 'txengine-testrunner-se',
      CONTAINER_IMAGE: 'eu.gcr.io/extenda/test:v1.0.0',
      TENANT_NAME: 'testrunner',
      POSTGRES_IP: 'sm://test-project/postgresql_private_address',
      POSTGRES_USER: 'default',
      POSTGRES_PASSWORD: 'sm://test-project/postgresql_master_password',
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
    });
  });
});
