jest.mock('@actions/exec');
const exec = require('@actions/exec');
const {
  createAttestation,
  getArtifactUrl,
} = require('../src/create-sign-attestion');

describe('Create attestation', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Create attestation', async () => {
    createAttestation(
      'eu.gcr.io/my-iamge@digest2626',
      'quality-assurance-attestor',
      'attestor-project',
      'key-project',
      'europe-west1',
      'global-keyring',
      'key',
      '1',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      '--quiet',
      'beta',
      'container',
      'binauthz',
      'attestations',
      'sign-and-create',
      '--artifact-url=eu.gcr.io/my-iamge@digest2626',
      '--attestor=quality-assurance-attestor',
      '--attestor-project=attestor-project',
      '--keyversion-project=key-project',
      '--keyversion-location=europe-west1',
      '--keyversion-keyring=global-keyring',
      '--keyversion-key=key',
      '--keyversion=1',
    ]);
  });

  test('Get artifact URL', async () => {
    getArtifactUrl(
      'sha1787',
      'eu.gcr.io/my-iamge',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'container',
      'images',
      'describe',
      'eu.gcr.io/my-iamge:sha1787',
      '--format="get(image_summary.digest)"',
    ]);
  });
});
