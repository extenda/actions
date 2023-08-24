const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');
const handleCertificates = require('./handle-certificate');
const setupExternalDomainMapping = require('./setup-external-domainmapping');
const projectWithoutNumbers = require('../../utils/clan-project-name');

// Create/fetch static IP
const createIP = async (projectID) => gcloudOutput([
  'compute',
  'addresses',
  'create',
  `${projectID}-lb-external-ip`,
  `--project=${projectID}`,
  '--global',
  '--ip-version=IPV4',
]);

const obtainIP = async (projectID) => gcloudOutput([
  'compute',
  'addresses',
  'describe',
  `${projectID}-lb-external-ip`,
  `--project=${projectID}`,
  '--global',
  '--format=get(address)',
]).catch(() => createIP(projectID)
  .then(() => obtainIP(projectID)));

const updateHttpsProxy = async (projectID, certificates, loadBalancerName) => gcloudOutput([
  'compute',
  'target-https-proxies',
  'update',
  'https-lb-proxy-external',
  `--url-map=${loadBalancerName}`,
  `--ssl-certificates=${certificates}`,
  '--ssl-policy=extenda-ssl-policy',
  `--project=${projectID}`,
]).then(() => core.info('Certificates updated successfully!'));

const createHttpsProxy = async (projectID, certificates, loadBalancerName) => gcloudOutput([
  'compute',
  'target-https-proxies',
  'create',
  'https-lb-proxy-external',
  `--url-map=${loadBalancerName}`,
  `--ssl-certificates=${certificates}`,
  '--ssl-policy=extenda-ssl-policy',
  `--project=${projectID}`,
]).catch(() => updateHttpsProxy(projectID, certificates, loadBalancerName));

const createForwardingRule = async (projectID, IP) => gcloudOutput([
  'compute',
  'forwarding-rules',
  'create',
  'https-proxy-external',
  `--address=${IP}`,
  '--target-https-proxy=https-lb-proxy-external',
  '--global',
  `--project=${projectID}`,
  '--ports=443',
]).catch(() => core.info('Forwarding rule already exists!'));

const createSSLPolicy = async (projectID) => gcloudOutput([
  'compute',
  'ssl-policies',
  'create',
  'extenda-ssl-policy',
  '--profile=MODERN',
  '--min-tls-version=1.2',
  `--project=${projectID}`,
  '--global',
]).catch(() => core.info('SSLPolicy already exist'));

const configureExternalLBFrontend = async (projectID, env, hosts, migrate) => {
  core.info('Obtaining ip for loadbalancer');
  const loadBalancerIP = await obtainIP(projectID);
  await setupExternalDomainMapping(hosts, migrate, loadBalancerIP);
  const loadBalancerName = `${projectWithoutNumbers(projectID, env)}-lb-external`;

  core.info('Creating proxies');
  await createSSLPolicy(projectID);
  const certificates = await handleCertificates(hosts, projectID);
  await createHttpsProxy(projectID, certificates, loadBalancerName);
  core.info('Creating forwarding rules');
  await createForwardingRule(projectID, loadBalancerIP);
};

module.exports = configureExternalLBFrontend;
