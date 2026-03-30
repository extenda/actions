import { execGcloud } from '../../../setup-gcloud/src/index.js';

const getToken = async (audience = 'cloud-deploy') =>
  execGcloud(
    ['auth', 'print-identity-token', `--audiences=${audience}`],
    'gcloud',
    true,
  );

export default getToken;
