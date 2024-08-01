const core = require('@actions/core');
const execGcloud = require('../../utils/gcloud-output');

const setCloudArmorPolicyTarget = async (service, policy, projectID) => {
  const backendName = `${service}-external-backend`;
  const args = [
    'compute',
    'backend-services',
    'update',
    backendName,
    '--global',
    `--security-policy=${policy}`,
    `--project=${projectID}`,
  ];
  return execGcloud(args);
};

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

const checkPolicyTarget = async (service, policy, projectID) => {
  const backendName = `${service}-external-backend`;
  const args = [
    'compute',
    'backend-services',
    'describe',
    backendName,
    '--global',
    `--project=${projectID}`,
    '--format=json',
  ];
  const result = await execGcloud(args);
  const { securityPolicy } = JSON.parse(result);
  const targetPolicyName = securityPolicy
    ? securityPolicy.split('/').pop()
    : '';
  return targetPolicyName === policy;
};

module.exports = {
  setCloudArmorPolicyTarget,
  checkPolicyExists,
  checkPolicyTarget,
};
