const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');
const { projectWithoutNumbers } = require('../../utils/clan-project-name');

const createDNSzone = async (projectID, env) => gcloudOutput([
  'dns',
  'managed-zones',
  'create',
  `${projectWithoutNumbers(projectID, env)}`,
  `--project=${projectID}`,
  '--description=A private internal managed dns zone',
  '--dns-name=internal',
  '--visibility=private',
  '--networks=clan-network',
  '--quiet',
]).catch(() => core.info('managed dns zone already exists'));

const createRecordSet = async (projectID, env, name, ip) => gcloudOutput([
  'dns',
  'record-sets',
  'create',
  `${name}.internal`,
  `--project=${projectID}`,
  `--zone=${projectWithoutNumbers(projectID, env)}`,
  '--type=A',
  '--ttl=300',
  `--rrdatas=${ip}`,
  '--quiet',
]).catch(() => core.info('managed dns zone already exists'));

const obtainInternalIp = async (projectId) => gcloudOutput([
  'compute',
  'forwarding-rules',
  'list',
  `--project=${projectId}`,
  '--filter=name=(\'http-proxy-internal\')',
  '--format=get(IPAddress)',
]);

const setupInternalDomainMapping = async (projectID, env, name) => {
  await createDNSzone(projectID, env);
  const ip = await obtainInternalIp(projectID);
  await createRecordSet(projectID, env, name, ip);
};

module.exports = setupInternalDomainMapping;
