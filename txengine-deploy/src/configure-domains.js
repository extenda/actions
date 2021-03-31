const exec = require("@actions/exec");
const core = require("@actions/core");
const { addDnsRecord } = require("../../cloud-run/src/dns-record");

let debugMode;

const DNSZone = async (env) => {
  if (env === 'staging') {
    return 'retailsvc-dev';
  }
  return 'retailsvc-com';
}

const gcloudOutput = async (args, bin = 'gcloud') => {
  let output = '';
  await exec.exec(bin, args, {
    silent: !debugMode,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  return output.trim();
};

// Create/fetch static IP named txengine-https
const createIP = async (projectID) => await gcloudOutput([
  'compute',
  'addresses',
  'create',
  'txengine-https-ip',
  `--project=${projectID}`,
  '--global',
  '--ip-version=IPV4'
]).then(() => obtainIP(projectID));

const obtainIP = async (projectID) => await gcloudOutput([
  'compute',
  'addresses',
  'describe',
  'txengine-https-ip',
  `--project=${projectID}`,
  '--global',
  '--format=get(address)'
]).catch(() => createIP(projectID));

// Check DNS exists or create tenant_name.retailsvc.dev/com
const checkDNS = async (env, fullDNS) => {
  let dnsList = JSON.parse(
    await gcloudOutput([
      'dns',
      'record-sets',
      'list',
      `--zone=${await DNSZone(env)}`,
      '--project=extenda',
      `--filter=${fullDNS}`,
      '--format=json']));
  for (const dns of dnsList) {
    let name = dns.name.slice(0, -1);
    if (name === fullDNS)
      return true;
  }
  return false;
}

const createDNS = async (env, fullDNS, loadBalancerIP) => {
  const dnsExists = await checkDNS(env, fullDNS);
  if (dnsExists) {
    core.info('DNS already exists!')
    return;
  }
  await addDnsRecord('dns', fullDNS, loadBalancerIP);
  core.info('DNS created!');
  return;
}

// Check firewall rule exists or create
const setupFirewallRule = async (projectID) => await gcloudOutput([
  'compute',
  'firewall-rules',
  'create',
  'allow-negs',
  '--network=tribe-network',
  '--action=allow',
  '--direction=ingress',
  '--source-ranges=130.211.0.0/22,35.191.0.0/16',
  '--rules=tcp:80',
  `--project=${projectID}`
]).catch(() => core.info('Firewall rule already exists!'));

// Create healthcheck if not exists

const setupHealthCheck = async (projectID) => await gcloudOutput([
  'compute',
  'health-checks',
  'create',
  'tcp',
  'txengine-health',
  '--global',
  '--use-serving-port',
  '--check-interval=10s',
  `--project=${projectID}`
]).catch(() => core.info('Health check already exists!'));

// Check if NEG exists
const checkNEG = async (tenantName, projectID, zone) => await gcloudOutput([
  'compute',
  'network-endpoint-groups',
  'describe',
  `${tenantName}-txengine`,
  `--project=${projectID}`,
  `--zone=${zone}`
]);

// Add NEG backend to backend-service
const addBackend = async (tenantName, projectID, zone) => await gcloudOutput([
  'compute',
  'backend-services',
  'add-backend',
  `${tenantName}-txengine`,
  `--network-endpoint-group=${tenantName}-txengine`,
  `--network-endpoint-group-zone=${zone}`,
  `--project=${projectID}`,
  '--global',
  '--balancing-mode=rate',
  '--max-rate-per-endpoint=1'
]).catch(() => core.info('Backend already added to service!'));

// Create backend-service 
const setupBackendService = async (tenantName, projectID) => await gcloudOutput([
  'compute',
  'backend-services',
  'create',
  `${tenantName}-txengine`,
  '--protocol=HTTP',
  '--port-name=http',
  '--connection-draining-timeout=300s',
  '--health-checks=txengine-health',
  '--global',
  '--enable-logging',
  '--logging-sample-rate=1',
  `--project=${projectID}`
]).catch(() => core.info('Backend service already exists!'));

// Create 404 bucket
const create404Bucket = async (tenantName, projectID) => await gcloudOutput([
  'mb',
  '-c',
  'standard',
  `-l`,
  'europe-west1',
  '-p',
  projectID,
  '-b',
  'on',
  'gs://txengine-404'
], 'gsutil')
  .then(() => gcloudOutput([
    'compute',
    'backend-buckets',
    'create',
    'txengine-404',
    '--gcs-bucket-name=txengine-404',
    `--project=${projectID}`
  ]))
  .catch(() => core.info('bucket already exists'));

// Create forwarding rule
const createLoadbalancer = async (projectID) => await gcloudOutput([
  'compute',
  'url-maps',
  'create',
  'txengine-lb',
  `--project=${projectID}`,
  '--default-backend-bucket=txengine-404'
]).catch(() => core.info('Loadbalancer already exist'));

// Create certificate containing old domains and new
const createCertificate = async (fullDNS, projectID) => await gcloudOutput([
  'compute',
  'ssl-certificates',
  'create',
  'cert-test',
  `--domains=${fullDNS}`,
  `--project=${projectID}`,
  '--global'
]).catch(() => core.info('Certificate already exists!'));
// Add certficate to frontend, if more than 2 remove oldest

// Add route to lb for new backend
const createHttpsProxy = async (projectID) => await gcloudOutput([
  'compute',
  'target-https-proxies',
  'create',
  'https-lb-proxy',
  '--url-map=txengine-lb',
  '--ssl-certificates=cert-test',
  `--project=${projectID}`
]).catch(() => core.info('Https proxy already exists!'));;

const createForwardingRule = async (projectID) => await gcloudOutput([
  'compute',
  'forwarding-rules',
  'create',
  'txengine-https',
  '--address=txengine-https-ip',
  '--target-https-proxy=https-lb-proxy',
  '--global',
  `--project=${projectID}`,
  '--ports=443'
]).catch(() => core.info('Forwarding rule already exist'));

// Caller method
const configureDomains = async (env, tenant, countryCode, debug = false, zone = 'europe-west1-d') => {
  debugMode = debug;
  tenantName = `${tenant}${countryCode && tenant ? `-${countryCode}` : ''}`;
  const fullDNS = `${tenantName !== '' ? `${tenantName}.` : ''}txengine.retailsvc.${env === 'staging' ? 'dev' : 'com'}`;
  const clusterProject = env === 'staging' ? 'experience-staging-b807' : 'experience-prod-852a';

  core.info('Obtaining ip for loadbalancer');
  const loadBalancerIP = await obtainIP(clusterProject);
  core.info('Creating firewall rule...');
  await setupFirewallRule(clusterProject);
  core.info('Creating DNS...');
  await createDNS(env, fullDNS, loadBalancerIP);
  core.info('Creating healthcheck');
  await setupHealthCheck(clusterProject);
  core.info('Creating backend service');
  await setupBackendService(tenantName, clusterProject);
  core.info('Creating 404-bucket');
  await create404Bucket(tenantName, clusterProject);
  core.info('Creating loadbalancer');
  await createLoadbalancer(clusterProject);
  core.info('Creating SSL-certificate');
  await createCertificate(fullDNS, clusterProject);
  core.info('Creating https proxy');
  await createHttpsProxy(clusterProject);
  core.info('Creating forwarding rule');
  await createForwardingRule(clusterProject);
  core.info('Adding backend NEG to backend service');
  await checkNEG(tenantName, clusterProject, zone)
    .then(() => addBackend(tenantName, clusterProject, zone))
    .catch(() => { throw new Error('The NEG was not found! make sure the deployment is correct') });

}

configureDomains('staging', 'test', 'se', false)