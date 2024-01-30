const core = require('@actions/core');
const axios = require('axios');
const fs = require('fs');
const glob = require('fast-glob');
const path = require('path');
const { execGcloud } = require('../../../setup-gcloud');
const getDasWorkerBaseUrl = require('../../../iam/src/das-worker-base-url');

const DEFAULT_LOG_MASK = `package system.log

# The policy below instructs OPA to remove all data from secrets before uploading the decision
# https://www.openpolicyagent.org/docs/latest/decision-logs/#masking-sensitive-data

mask["/input/attributes/request/http/headers/authorization"]
mask["/nd_builtin_cache"]
`;

const loadRego = (regoFile) => ({
  path: path.relative('policies', regoFile),
  content: fs.readFileSync(regoFile, 'utf-8'),
});

const createPayload = (version) => {
  const logFile = path.join('policies', 'system', 'log', 'mask.rego');
  if (!fs.existsSync(logFile)) {
    core.info('Use default log mask');
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.writeFileSync(logFile, DEFAULT_LOG_MASK, 'utf-8');
  }
  const files = glob.sync('policies/**/*.rego').map(loadRego);
  return {
    revision: version,
    files,
  };
};

const publishPolicies = async (serviceName, env, version, deployYaml) => {
  const { security: { 'permission-prefix': permissionPrefix, 'system-name': systemName } } = deployYaml;
  if (permissionPrefix && fs.existsSync(path.join('policies', 'policy'))) {
    const dasWorkerBaseUrl = getDasWorkerBaseUrl(systemId);
    const systemId = `${permissionPrefix}.${systemName || serviceName}-${env}`;
    core.info(`Publish security policies for ${systemId}`);
    const idToken = await execGcloud(['auth', 'print-identity-token', '--audiences=iam-das-worker']);
    await axios.put(
      `${dasWorkerBaseUrl}/systems/${systemId}/policies`,
      createPayload(version),
      {
        headers: {
          authorization: `Bearer ${idToken}`,
        },
      },
    );
  }
};

module.exports = publishPolicies;
