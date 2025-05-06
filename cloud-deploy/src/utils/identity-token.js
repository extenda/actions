const { execGcloud } = require('../../../setup-gcloud');

const getToken = async (audience = 'cloud-deploy') =>
  execGcloud(
    ['auth', 'print-identity-token', `--audiences=${audience}`],
    'gcloud',
    true,
  );

module.exports = getToken;
