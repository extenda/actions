import { execGcloud } from '../../../setup-gcloud.js';

const getToken = async (audience = 'cloud-deploy') =>
  execGcloud(
    ['auth', 'print-identity-token', `--audiences=${audience}`],
    'gcloud',
    true,
  );

export default getToken;
