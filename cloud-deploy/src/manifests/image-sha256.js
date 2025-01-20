const { execGcloud } = require('../../../setup-gcloud');

const getImageWithSha256 = async (semanticImage) =>
  execGcloud([
    'artifacts',
    'docker',
    'images',
    'list',
    semanticImage,
    '--include-tags',
    '--format=get(image_summary.digest)',
  ]).then((digest) => `${semanticImage.split(':')[0]}@${digest}`);

module.exports = getImageWithSha256;
