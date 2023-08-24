const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');

const getRecordSetIP = async (zone, projectID, host) => gcloudOutput([
  'dns',
  'record-sets',
  'describe',
  host,
  '--type=A',
  `--zone=${zone}`,
  `--project=${projectID}`,
  '--format=get(rrdatas)',
]).catch(() => false);

const createUpdateRecordSet = async (
  zone,
  projectID,
  host,
  loadBalancerIP,
  createOrUpdate,
) => gcloudOutput([
  'dns',
  'record-sets',
  createOrUpdate,
  host,
  '--type=A',
  `--rrdatas=${loadBalancerIP}`,
  `--zone=${zone}`,
  `--project=${projectID}`,
  '--ttl=300',
]).catch(() => false);

const setupExternalDomainMapping = async (hosts, migrate, loadBalancerIP) => {
  const projectID = 'extenda';
  const DNSZones = JSON.parse(await gcloudOutput([
    'dns',
    'managed-zones',
    'list',
    `--project=${projectID}`,
    '--format=json',
  ]));
  const hostsToHandle = hosts.toString().split(',');
  core.info(`listing all hosts:${hostsToHandle}`);
  for (const host of hostsToHandle) {
    core.info(`handling ${host}`);
    // get domain
    const hostZone = host.split('.').slice(-2).join('.');
    core.info(`hostzone is ${hostZone} for: ${host}`);
    for (const dnsZone of DNSZones) {
      if (`${hostZone}.` === dnsZone.dnsName) {
        const zone = dnsZone.name;
        // check if host already exists and if ip needs to be updated
        // eslint-disable-next-line no-await-in-loop
        const recordSetIP = await getRecordSetIP(zone, projectID, host);
        core.info(`handling ${host} recordsetIP set to currently: ${recordSetIP}`);
        if (!recordSetIP) {
          // create recordset if doesn't exist
          core.info(`creating ${host} with ip: ${recordSetIP}`);
          // eslint-disable-next-line no-await-in-loop
          await createUpdateRecordSet(zone, projectID, host, loadBalancerIP, 'create');
        } else if (migrate === 'true' && loadBalancerIP !== recordSetIP) {
          // update recordset if migrate true and ip is mismatch
          core.info(`migrating ${host} to ip: ${recordSetIP}`);
          // eslint-disable-next-line no-await-in-loop
          await createUpdateRecordSet(zone, projectID, host, loadBalancerIP, 'update');
        } else {
          // if migrate false remove host from host array to avoid certificates creation
          core.info(`removing ${host} from certificate handling due to migrate false`);
          const index = hosts.indexOf(host);
          if (index !== -1) {
            hosts.splice(index, 1);
          }
        }
      }
    }
  }
};

module.exports = setupExternalDomainMapping;
