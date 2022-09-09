const exec = require('@actions/exec');

const updateAccess = async (CICDServiceAccount, serviceAccount, projectID, action) => {
  const args = [
    'iam',
    'service-accounts',
    serviceAccount,
    `${action}-iam-policy-binding`,
    `--project=${projectID}`,
    `--member=serviceAccount:${CICDServiceAccount}`,
    '--role=roles/iam.serviceAccountTokenCreator',
  ];
  await exec.exec('gcloud', args);
};

module.exports = updateAccess;
