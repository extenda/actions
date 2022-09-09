jest.mock('@actions/exec');

const exec = require('@actions/exec');
const updateAccess = require('../src/update-access');

describe('Obtain an identity token', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Add permission', async () => {
    await updateAccess(
      'ci-cd@example.iam.gserviceaccount.com',
      'api-tst@example.iam.gserviceaccount.com',
      'project-tst-staging',
      'add',
    );

    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'iam',
      'service-accounts',
      'api-tst@example.iam.gserviceaccount.com',
      'add-iam-policy-binding',
      '--project=project-tst-staging',
      '--member=serviceAccount:ci-cd@example.iam.gserviceaccount.com',
      '--role=roles/iam.serviceAccountTokenCreator',
    ]);
  });

  test('Remove permission', async () => {
    await updateAccess(
      'ci-cd@example.iam.gserviceaccount.com',
      'api-tst@example.iam.gserviceaccount.com',
      'project-tst-staging',
      'remove',
    );

    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'iam',
      'service-accounts',
      'api-tst@example.iam.gserviceaccount.com',
      'remove-iam-policy-binding',
      '--project=project-tst-staging',
      '--member=serviceAccount:ci-cd@example.iam.gserviceaccount.com',
      '--role=roles/iam.serviceAccountTokenCreator',
    ]);
  });
});
