import { execGcloud } from '../../setup-gcloud';

// Fetch an identity token for the specified account
const fetchToken = async (serviceAccount, audiences) =>
  execGcloud([
    'auth',
    'print-identity-token',
    `--impersonate-service-account=${serviceAccount}`,
    '--include-email',
    `--audiences=${audiences}`,
  ]);

export default fetchToken;
