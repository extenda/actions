const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');
const setupInternalDomainMapping = require('./setup-internal-domainmapping');

const createCertificate = async (projectID, region = 'europe-west1') => gcloudOutput([
  'compute',
  'ssl-certificates',
  'create',
  'extenda-internal-certificate',
  '--certificate=cert.cert',
  '--private-key=key.key',
  `--project=${projectID}`,
  `--region=${region}`,
]).catch(() => core.info('Certificate already exists!'));

const createHttpProxy = async (projectID, env) => gcloudOutput([
  'compute',
  'target-http-proxies',
  'create',
  'http-lb-proxy-internal',
  `--url-map=${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
  '--region=europe-west1',
  `--project=${projectID}`,
]).catch(() => core.info('proxy already exists'));

const createHttpsProxy = async (projectID, env) => gcloudOutput([
  'compute',
  'target-https-proxies',
  'create',
  'https-lb-proxy-internal',
  '--ssl-certificates=extenda-internal-certificate',
  `--url-map=${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
  '--region=europe-west1',
  `--project=${projectID}`,
]).catch(() => core.info('proxy already exists'));

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

const createHttpsForwardingRule = async (projectID) => gcloudOutput([
  'compute',
  'forwarding-rules',
  'create',
  'https-proxy-internal',
  '--load-balancing-scheme=INTERNAL_MANAGED',
  '--subnet=k8s-subnet',
  '--network=clan-network',
  '--target-https-proxy=https-lb-proxy-internal',
  '--target-https-proxy-region=europe-west1',
  '--region=europe-west1',
  `--project=${projectID}`,
  '--ports=443',
]).catch(() => core.info('Forwarding rule already exists!'));

const configureInternalFrontend = async (projectID, name, env, protocol) => {
  if (protocol === 'http2') {
    await createCertificate(projectID);
    await createHttpsProxy(projectID, env);
    await createHttpsForwardingRule(projectID);
  } else {
    await createHttpProxy(projectID, env);
    await createForwardingRule(projectID);
  }
  await setupInternalDomainMapping(projectID, env, name, protocol);
};

module.exports = configureInternalFrontend;
