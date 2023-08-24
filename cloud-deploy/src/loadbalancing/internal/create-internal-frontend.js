const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');
const setupInternalDomainMapping = require('./setup-internal-domainmapping');

const updateHttpProxy = async (projectID, env) => gcloudOutput([
  'compute',
  'target-http-proxies',
  'update',
  'http-lb-proxy-internal',
  `--url-map=${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
  '--region=europe-west1',
  `--project=${projectID}`,
]).then(() => core.info('Certificates updated successfully!'));

const createHttpProxy = async (projectID, env) => gcloudOutput([
  'compute',
  'target-http-proxies',
  'create',
  'http-lb-proxy-internal',
  `--url-map=${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
  '--region=europe-west1',
  `--project=${projectID}`,
]).catch(() => updateHttpProxy(projectID, env));

const createForwardingRule = async (projectID) => gcloudOutput([
  'compute',
  'forwarding-rules',
  'create',
  'http-proxy-internal',
  '--load-balancing-scheme=INTERNAL_MANAGED',
  '--subnet=k8s-subnet',
  '--network=clan-network',
  '--target-http-proxy=http-lb-proxy-internal',
  '--target-http-proxy-region=europe-west1',
  '--region=europe-west1',
  `--project=${projectID}`,
  '--ports=80',
]).catch(() => core.info('Forwarding rule already exists!'));

const configureInternalFrontend = async (projectID, name, env) => {
  await createHttpProxy(projectID, env);
  core.info('Creating forwarding rules');
  await createForwardingRule(projectID);
  await setupInternalDomainMapping(projectID, env, name);
};

module.exports = configureInternalFrontend;
