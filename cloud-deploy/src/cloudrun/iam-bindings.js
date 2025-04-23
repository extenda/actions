const core = require('@actions/core');
const gcloudOutput = require('../utils/gcloud-output');

const addPrefix = (account) => {
  const accountType = account.split(':')[0];
  if (accountType === account) {
    return `serviceAccount:${account}`;
  }
  return account;
};

const checkMembers = async (members, accounts) => {
  const toAdd = [];
  for (const account of accounts) {
    const accountPrefixed = addPrefix(account);
    if (members.length === 0) {
      toAdd.push(accountPrefixed);
    } else {
      for (const [index, member] of members.entries()) {
        if (accountPrefixed === member) {
          members.splice(index, 1);
          break;
        }
        if (index === members.length - 1) {
          toAdd.push(accountPrefixed);
        }
      }
    }
  }
  return { toAdd, toRemove: members };
};

const allowAllRequests = async (projectID, name) =>
  gcloudOutput([
    'run',
    'services',
    'add-iam-policy-binding',
    name,
    '--member=allUsers',
    '--role=roles/run.invoker',
    '--region=europe-west1',
    `--project=${projectID}`,
  ]);

const getPolicyBindings = async (projectID, name) =>
  gcloudOutput([
    'run',
    'services',
    'get-iam-policy',
    name,
    '--region=europe-west1',
    `--project=${projectID}`,
    '--format=json',
  ]);

const allowAccountRequests = async (projectID, name, account) =>
  gcloudOutput([
    'run',
    'services',
    'add-iam-policy-binding',
    name,
    `--member=${account}`,
    '--role=roles/run.invoker',
    '--region=europe-west1',
    `--project=${projectID}`,
  ]);

const disallowAccountRequests = async (projectID, name, account) =>
  gcloudOutput([
    'run',
    'services',
    'remove-iam-policy-binding',
    name,
    `--member=${account}`,
    '--role=roles/run.invoker',
    '--region=europe-west1',
    `--project=${projectID}`,
  ]);
const setupAuthorization = async (projectID, name, accounts) => {
  if (accounts.length === 0) {
    await allowAllRequests(projectID, name);
  } else {
    const currentPolicyBindings = JSON.parse(
      await getPolicyBindings(projectID, name),
    );
    if (!currentPolicyBindings.bindings) {
      currentPolicyBindings.bindings = [
        { members: [], role: 'roles/run.invoker' },
      ];
    }
    for (const policy of currentPolicyBindings.bindings) {
      if (policy.role === 'roles/run.invoker') {
        const addRemoveMember = await checkMembers(policy.members, accounts);
        for (const removeMember of addRemoveMember.toRemove) {
          core.info(`remove iam binding: ${removeMember}`);
          await disallowAccountRequests(projectID, name, removeMember);
        }
        for (const addMember of addRemoveMember.toAdd) {
          core.info(`add iam binding: ${addMember}`);
          await allowAccountRequests(projectID, name, addMember);
        }
        break;
      }
    }
  }
};

module.exports = setupAuthorization;
