const exec = require("@actions/exec");
const core = require("@actions/core");
const { addDnsRecord } = require("../../cloud-run/src/dns-record");

let debugMode;

const zone = async (env) => {
  if (env === 'staging') {
    return 'retailsvc-dev';
  }
  return 'retailsvc-com';
}

const gcloudOutput = async (args) => {
  let output = '';
  await exec.exec('gcloud', args, {
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
  'txengine-https',
  `--project=${projectID}`,
  '--global',
  '--ip-version=IPV4'
]).then(() => obtainIP(projectID));

const obtainIP = async (projectID) => await gcloudOutput([
  'compute',
  'addresses',
  'describe',
  'txengine-https',
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
      `--zone=${await zone(env)}`,
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

// Create certificate containing old domains and new

// Add certficate to frontend, if more than 2 remove oldest

// Create backend from neg

// Add route to lb for new backend

// Caller method
const configureDomains = async (env, tenantName, debug = false) => {
  debugMode = debug;
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
  
}

configureDomains('staging', '')