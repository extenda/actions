jest.mock('../../setup-gcloud');
const { execGcloud } = require('../../setup-gcloud');
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
    execGcloud.mockResolvedValueOnce('digest2626');
    expect(execGcloud).toHaveBeenCalledTimes(1);
    expect(execGcloud).toHaveBeenCalledWith([
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

  test('Get artifact URL with default tag', async () => {
    const imagePath = 'eu.gcr.io/my-image';
    const digest = 'djdq1787';
    execGcloud.mockResolvedValueOnce(digest);

    expect(await getArtifactUrl('tag', imagePath)).toEqual('eu.gcr.io/my-image@djdq1787');
    expect(execGcloud).toHaveBeenCalledTimes(1);
  });

  test('Get artifact URL provided a tag in the imagePath', async () => {
    const imagePath = 'eu.gcr.io/my-image:tag1';
    const digest = 'dut6h1787';
    execGcloud.mockResolvedValueOnce(digest);

    expect(await getArtifactUrl('tag1', imagePath)).toEqual('eu.gcr.io/my-image@dut6h1787');
    expect(execGcloud).toHaveBeenCalledTimes(1);
  });
});
