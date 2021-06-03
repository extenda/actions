const exec = require('@actions/exec');

// Fetch an identity token for the specified account
const fetchToken = async (serviceAccount, audiences) => {
  const args = [
    'auth',
    'print-identity-token',
    `--impersonate-service-account=${serviceAccount}`,
    '--include-email',
    `--audiences=${audiences}`,
  ];
  let token = '';
  await exec.exec('gcloud', args, {
    silent: true,
    listeners: {
      stdout: (data) => {
        token += data.toString('utf8');
      },
    },
  });

  return token;
};

module.exports = fetchToken;
