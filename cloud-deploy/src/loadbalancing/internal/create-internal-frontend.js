const gcloudOutput = require('../../utils/gcloud-output');
const setupInternalDomainMapping = require('./setup-internal-domainmapping');
const { projectWithoutNumbers } = require('../../utils/clan-project-name');

const createCertificate = async (projectID, region = 'europe-west1') => gcloudOutput([
  'compute',
  'ssl-certificates',
  'create',
  'extenda-internal-certificate',
  '--certificate=cert.cert',
  '--private-key=key.key',
  `--project=${projectID}`,
  `--region=${region}`,
]);

const createHttpProxy = async (projectID, env) => gcloudOutput([
  'compute',
  'target-http-proxies',
  'create',
  'http-lb-proxy-internal',
  `--url-map=${projectWithoutNumbers(projectID, env)}-lb-internal`,
  '--region=europe-west1',
  `--project=${projectID}`,
]);

const createHttpsProxy = async (projectID, env) => gcloudOutput([
  'compute',
  'target-https-proxies',
  'create',
  'https-lb-proxy-internal',
  '--ssl-certificates=extenda-internal-certificate',
  `--url-map=${projectWithoutNumbers(projectID, env)}-lb-internal`,
  '--region=europe-west1',
  `--project=${projectID}`,
]);

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
]);

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
]);

const configureInternalFrontend = async (projectID, name, env, protocol, platformGKE) => {
  if (protocol === 'http2' && platformGKE) {
    await createCertificate(projectID);
    await createHttpsProxy(projectID, env);
    await createHttpsForwardingRule(projectID);
  } else {
    await createHttpProxy(projectID, env);
    await createForwardingRule(projectID);
  }
  await setupInternalDomainMapping(projectID, env, name, protocol, platformGKE);
};

module.exports = configureInternalFrontend;
