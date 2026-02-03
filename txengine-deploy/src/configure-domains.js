import core from '@actions/core';

import { addDnsRecord } from '../../cloud-run/src/dns-record';
import gcloudOutput from './gcloud-output';
import handleCertificates from './handle-certificate';

const staticIPName = 'txengine-https-ip';
const loadBalancerName = 'txengine-lb';
const healthcheckName = 'txengine-health';
const backendBucketName = 'txengine-404';

const DNSZone = async (env) => {
  if (env === 'staging') {
    return 'retailsvc-dev';
  }
  return 'retailsvc-com';
};

// Create/fetch static IP named txengine-https
const createIP = async (projectID) =>
  gcloudOutput([
    'compute',
    'addresses',
    'create',
    staticIPName,
    `--project=${projectID}`,
    '--global',
    '--ip-version=IPV4',
  ]);

const obtainIP = async (projectID) =>
  gcloudOutput([
    'compute',
    'addresses',
    'describe',
    staticIPName,
    `--project=${projectID}`,
    '--global',
    '--format=get(address)',
  ]).catch(() => createIP(projectID).then(() => obtainIP(projectID)));

// Check DNS exists or create tenant_name.retailsvc.dev/com
const checkDNS = async (env, fullDNS) => {
  const dnsList = JSON.parse(
    await gcloudOutput([
      'dns',
      'record-sets',
      'list',
      `--zone=${await DNSZone(env)}`,
      '--project=extenda',
      `--filter=${fullDNS}`,
      '--format=json',
    ]),
  );
  for (const dns of dnsList) {
    const name = dns.name.slice(0, -1);
    if (name === fullDNS) return true;
  }
  return false;
};

const createDNS = async (env, fullDNS, loadBalancerIP) => {
  const dnsExists = await checkDNS(env, fullDNS);
  if (dnsExists) {
    core.info('DNS already exists!');
    return;
  }
  await addDnsRecord('dns', fullDNS, loadBalancerIP);
  core.info('DNS created!');
};

// Check firewall rule exists or create
const setupFirewallRule = async (projectID) =>
  gcloudOutput([
    'compute',
    'firewall-rules',
    'create',
    'allow-negs',
    '--network=tribe-network',
    '--action=allow',
    '--direction=ingress',
    '--source-ranges=130.211.0.0/22,35.191.0.0/16',
    '--rules=tcp:80',
    `--project=${projectID}`,
  ]).catch(() => core.info('Firewall rule already exists!'));

// Create healthcheck if not exists

const setupHealthCheck = async (projectID) =>
  gcloudOutput([
    'compute',
    'health-checks',
    'create',
    'tcp',
    healthcheckName,
    '--global',
    '--use-serving-port',
    '--check-interval=10s',
    `--project=${projectID}`,
  ]).catch(() => core.info('Health check already exists!'));

// Create 404 bucket
const create404Bucket = async (projectID, postfix) =>
  gcloudOutput(
    [
      'mb',
      '-c',
      'standard',
      '-l',
      'europe-west1',
      '-p',
      projectID,
      '-b',
      'on',
      `gs://${backendBucketName + postfix}`,
    ],
    'gsutil',
  )
    .then(() =>
      gcloudOutput([
        'compute',
        'backend-buckets',
        'create',
        backendBucketName + postfix,
        `--gcs-bucket-name=${backendBucketName + postfix}`,
        `--project=${projectID}`,
      ]),
    )
    .catch(() => core.info('Bucket already exists!'));

// Create loadbalancer rule
const createLoadbalancer = async (projectID, postfix) =>
  gcloudOutput([
    'compute',
    'url-maps',
    'create',
    loadBalancerName,
    `--project=${projectID}`,
    `--default-backend-bucket=${backendBucketName + postfix}`,
  ]).catch(() => core.info('Loadbalancer already exists!'));

// Add route to lb for new backend
const updateHttpsProxy = async (projectID, certificates) =>
  gcloudOutput([
    'compute',
    'target-https-proxies',
    'update',
    'https-lb-proxy',
    `--url-map=${loadBalancerName}`,
    `--ssl-certificates=${certificates}`,
    `--project=${projectID}`,
  ]).then(() => core.info('Certificates updated successfully!'));

const createHttpsProxy = async (projectID, certificates) =>
  gcloudOutput([
    'compute',
    'target-https-proxies',
    'create',
    'https-lb-proxy',
    `--url-map=${loadBalancerName}`,
    `--ssl-certificates=${certificates}`,
    `--project=${projectID}`,
  ]).catch(() => updateHttpsProxy(projectID, certificates));

const createHttpProxy = async (projectID) =>
  gcloudOutput([
    'compute',
    'target-http-proxies',
    'create',
    'http-lb-proxy',
    `--url-map=${loadBalancerName}`,
    `--project=${projectID}`,
  ]).catch(() => core.info('Http proxy already exists!'));

const createForwardingRule = async (projectID, HTTP) =>
  gcloudOutput([
    'compute',
    'forwarding-rules',
    'create',
    HTTP ? 'txengine-http' : 'txengine-https',
    `--address=${staticIPName}`,
    HTTP
      ? '--target-http-proxy=http-lb-proxy'
      : '--target-https-proxy=https-lb-proxy',
    '--global',
    `--project=${projectID}`,
    HTTP ? '--ports=80' : '--ports=443',
  ]).catch(() => core.info('Forwarding rule already exists!'));

// Create backend-service
const setupBackendService = async (name, projectID) =>
  gcloudOutput([
    'compute',
    'backend-services',
    'create',
    `${name}`,
    '--protocol=HTTP',
    '--port-name=http',
    '--connection-draining-timeout=300s',
    `--health-checks=${healthcheckName}`,
    '--timeout=120s',
    '--global',
    '--enable-logging',
    '--logging-sample-rate=1',
    `--project=${projectID}`,
  ]).catch(() => core.info('Backend service already exists!'));

// Check if NEG exists
const checkNEG = async (tenantName, projectID, zone) =>
  gcloudOutput([
    'compute',
    'network-endpoint-groups',
    'describe',
    `${tenantName}-txengine`,
    `--project=${projectID}`,
    `--zone=${zone}`,
  ]);

// Add NEG backend to backend-service
const addBackend = async (name, projectID, zone) =>
  gcloudOutput([
    'compute',
    'backend-services',
    'add-backend',
    `${name}`,
    `--network-endpoint-group=${name}`,
    `--network-endpoint-group-zone=${zone}`,
    `--project=${projectID}`,
    '--global',
    '--balancing-mode=rate',
    '--max-rate-per-endpoint=1',
  ]).catch(() => core.info('Backend already added to service!'));

const setupBackendURLMapping = async (host, tenant, projectID) =>
  gcloudOutput([
    'compute',
    'url-maps',
    'add-path-matcher',
    loadBalancerName,
    `--project=${projectID}`,
    `--default-service=${tenant}-txengine`,
    `--path-matcher-name=${tenant}-posserver`,
    `--path-rules=/ReferenceDataWebService=${tenant}-posserver`,
    '--global',
    `--new-hosts=${host}`,
  ]).catch(() => core.info('Url-mapping already exists!'));

// Caller method
const configureDomains = async (
  env,
  tenant,
  countryCode,
  zone = 'europe-west1-d',
) => {
  const tenantName = `${tenant}${countryCode && tenant ? `-${countryCode}` : ''}`;
  const fullDNS = `${tenantName !== '' ? `${tenantName}.` : ''}txengine.retailsvc.${env === 'staging' ? 'dev' : 'com'}`;
  const clusterProject =
    env === 'staging' ? 'experience-staging-b807' : 'experience-prod-852a';

  core.info('Obtaining ip for loadbalancer');
  const loadBalancerIP = await obtainIP(clusterProject);
  core.info('Creating firewall rule...');
  await setupFirewallRule(clusterProject);
  core.info('Creating DNS...');
  await createDNS(env, fullDNS, loadBalancerIP);
  core.info('Creating healthcheck');
  await setupHealthCheck(clusterProject);
  core.info('Creating 404-bucket');
  await create404Bucket(clusterProject, env === 'prod' ? 'prod' : '');
  core.info('Creating loadbalancer');
  await createLoadbalancer(clusterProject, env === 'prod' ? 'prod' : '');
  const certificates = await handleCertificates(fullDNS, clusterProject);
  core.info('Creating proxies');
  if (certificates) {
    await createHttpsProxy(clusterProject, certificates);
  }
  await createHttpProxy(clusterProject);
  core.info('Creating forwarding rules');
  await createForwardingRule(clusterProject, false);
  await createForwardingRule(clusterProject, true);
  core.info('Creating backend service');
  await setupBackendService(`${tenantName}-txengine`, clusterProject);
  await setupBackendService(`${tenantName}-posserver`, clusterProject);

  core.info('Adding backend NEG to backend service');
  await checkNEG(tenantName, clusterProject, zone)
    .then(() => addBackend(`${tenantName}-txengine`, clusterProject, zone))
    .then(() => addBackend(`${tenantName}-posserver`, clusterProject, zone))
    .then(() =>
      addBackend(`${tenantName}-txengine`, clusterProject, 'europe-west1-c'),
    )
    .then(() =>
      addBackend(`${tenantName}-posserver`, clusterProject, 'europe-west1-c'),
    )
    .catch(() => {
      throw new Error(
        'The NEG was not found! make sure the deployment is correct',
      );
    });

  core.info('Setup url-mapping');
  return setupBackendURLMapping(fullDNS, tenantName, clusterProject);
};

module.exports = configureDomains;
