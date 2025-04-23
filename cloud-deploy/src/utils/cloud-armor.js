const core = require('@actions/core');
const execGcloud = require('./gcloud-output');

const checkPolicyExists = async (policy, projectID) => {
  const args = [
    'compute',
    'security-policies',
    'describe',
    policy,
    `--project=${projectID}`,
  ];
  return execGcloud(args, 'gcloud', true, true)
    .then(() => core.info(`Using ${policy} for backend policy`))
    .catch(() => {
      throw new Error(`No cloud armor policy with name "${policy}" found`);
    });
};

module.exports = checkPolicyExists;
