const exec = require('@actions/exec');

const getImageDigest = async (image) => {
  const imageName = image.split(':')[0];
  const args = [
    'artifacts',
    'docker',
    'images',
    'list',
    image,
    '--include-tags',
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

module.exports = getImageDigest;
