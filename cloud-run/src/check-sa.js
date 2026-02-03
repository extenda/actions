import exec from '@actions/exec';

const getServiceAccounts = async (project) => {
  let output = '';
  await exec.exec(
    'gcloud',
    [
      'iam',
      'service-accounts',
      'list',
      `--project=${project}`,
      '--format=value(EMAIL)',
    ],
    {
      silent: true,
      listeners: {
        stdout: (data) => {
          output += data.toString('utf8');
        },
      },
    },
  );
  return output.split(/[\r\n]+/);
};

const checkServiceAccount = async (serviceName, projectID) => {
  const emails = await getServiceAccounts(projectID);
  const match = emails.find(
    (email) => email === `${serviceName}@${projectID}.iam.gserviceaccount.com`,
  );
  if (!match) {
    throw new Error(
      'This service has no service account. Please refer to "https://github.com/extenda/tf-infra-gcp/blob/master/docs/project-config.md#services" for help',
    );
  }
};

module.exports = checkServiceAccount;
