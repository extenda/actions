const exec = require('@actions/exec');

// Binauthz attestations gcloud cmd
const createAttestation = async (
  artifactUrl,
  attestor,
  attestorProject,
  keyversionProject,
  keyversionLocation,
  keyversionKeyring,
  keyversionKey,
  keyversion,
) => {
  const args = [
    '--quiet',
    'beta',
    'container',
    'binauthz',
    'attestations',
    'sign-and-create',
    `--artifact-url=${artifactUrl}`,
    `--attestor=${attestor}`,
    `--attestor-project=${attestorProject}`,
    `--keyversion-project=${keyversionProject}`,
    `--keyversion-location=${keyversionLocation}`,
    `--keyversion-keyring=${keyversionKeyring}`,
    `--keyversion-key=${keyversionKey}`,
    `--keyversion=${keyversion}`,
  ];
  return exec.exec('gcloud', args);
};

const getArtifactUrl = async (tag, imagePath) => {
  const imageName = imagePath.split(':')[0] || imagePath;
  const container = `${imageName}:${tag}`;
  const args = [
    'container',
    'images',
    'describe',
    container,
    '--format=get(image_summary.digest)',
  ];

  let digest = '';
  await exec.exec('gcloud', args, {
    silent: false,
    listeners: {
      stdout: (data) => {
        digest += data.toString('utf8');
      },
    },
  });

  digest = digest.trim();
  return `${imageName}@${digest}`;
};

module.exports = {
  createAttestation,
  getArtifactUrl,
};
