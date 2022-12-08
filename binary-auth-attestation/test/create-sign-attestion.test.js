jest.mock('@actions/exec');
const exec = require('@actions/exec');
const {
  createAttestation,
  getArtifactUrl,
} = require('../src/create-sign-attestion');

const mockExecListeners = (output) => (cmd, args, opts) => {
  opts.listeners.stdout(Buffer.from(output, 'utf8'));
  return Promise.resolve(0);
};

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

  test('Get artifact URL with default tag', async () => {
    const imagePath = 'eu.gcr.io/my-image';
    const digest = 'djdq1787';
    exec.exec
      .mockImplementationOnce(mockExecListeners(digest));

    expect(await getArtifactUrl('tag', imagePath)).toEqual('eu.gcr.io/my-image@djdq1787');
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('Get artifact URL provided a tag in the imagePath', async () => {
    const imagePath = 'eu.gcr.io/my-image:tag1';
    const digest = 'dut6h1787';
    exec.exec
      .mockImplementationOnce(mockExecListeners(digest));

    expect(await getArtifactUrl('tag1', imagePath)).toEqual('eu.gcr.io/my-image@dut6h1787');
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
