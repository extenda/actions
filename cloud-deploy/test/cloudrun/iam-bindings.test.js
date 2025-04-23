const setupAuthorization = require('../../src/cloudrun/iam-bindings');
const execGcloud = require('../../src/utils/gcloud-output');

jest.mock('../../src/utils/gcloud-output');

describe('Setup iam bindings', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('allow accounts if referenced', async () => {
    const mockData = {
      bindings: [
        {
          members: [
            'user:test@extendaretail.com',
            'serviceAccount:platform-service@project.serviceaccount',
            'serviceAccount:platform-service-remove-me@project.serviceaccount',
          ],
          role: 'roles/run.invoker',
        },
      ],
    };
    execGcloud.mockResolvedValueOnce(JSON.stringify(mockData));
    execGcloud.mockResolvedValueOnce();
    const accounts = [
      'user:test@extendaretail.com',
      'platform-service@project.serviceaccount',
      'group:some-group@extendaretail.com',
      'some-account@extendaretail.com',
      'some-account1@extendaretail.com',
      'some-account2@extendaretail.com',
      'some-account3@extendaretail.com',
    ];
    await setupAuthorization('test-staging-t3st', 'service-name', accounts);
    expect(execGcloud).toHaveBeenCalledTimes(7);
    expect(execGcloud).toHaveBeenNthCalledWith(2, [
      'run',
      'services',
      'remove-iam-policy-binding',
      'service-name',
      '--member=serviceAccount:platform-service-remove-me@project.serviceaccount',
      '--role=roles/run.invoker',
      '--region=europe-west1',
      '--project=test-staging-t3st',
    ]);
    expect(execGcloud).toHaveBeenNthCalledWith(3, [
      'run',
      'services',
      'add-iam-policy-binding',
      'service-name',
      '--member=group:some-group@extendaretail.com',
      '--role=roles/run.invoker',
      '--region=europe-west1',
      '--project=test-staging-t3st',
    ]);
    expect(execGcloud).toHaveBeenNthCalledWith(4, [
      'run',
      'services',
      'add-iam-policy-binding',
      'service-name',
      '--member=serviceAccount:some-account@extendaretail.com',
      '--role=roles/run.invoker',
      '--region=europe-west1',
      '--project=test-staging-t3st',
    ]);
    expect(execGcloud).toHaveBeenNthCalledWith(7, [
      'run',
      'services',
      'add-iam-policy-binding',
      'service-name',
      '--member=serviceAccount:some-account3@extendaretail.com',
      '--role=roles/run.invoker',
      '--region=europe-west1',
      '--project=test-staging-t3st',
    ]);
  });

  test('allow all users if no accounts is referenced', async () => {
    execGcloud.mockResolvedValueOnce();
    const accounts = [];
    await setupAuthorization('test-staging-t3st', 'service-name', accounts);
    expect(execGcloud).toHaveBeenCalledTimes(1);
    expect(execGcloud).toHaveBeenNthCalledWith(1, [
      'run',
      'services',
      'add-iam-policy-binding',
      'service-name',
      '--member=allUsers',
      '--role=roles/run.invoker',
      '--region=europe-west1',
      '--project=test-staging-t3st',
    ]);
  });

  test('allow accounts if no bindings is found', async () => {
    const mockData = {};
    execGcloud.mockResolvedValueOnce(JSON.stringify(mockData));
    execGcloud.mockResolvedValueOnce();
    const accounts = ['user:test@extendaretail.com'];
    await setupAuthorization('test-staging-t3st', 'service-name', accounts);
    expect(execGcloud).toHaveBeenCalledTimes(2);
    expect(execGcloud).toHaveBeenNthCalledWith(2, [
      'run',
      'services',
      'add-iam-policy-binding',
      'service-name',
      '--member=user:test@extendaretail.com',
      '--role=roles/run.invoker',
      '--region=europe-west1',
      '--project=test-staging-t3st',
    ]);
  });
});
