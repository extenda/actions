import core from '@actions/core';
import exec from '@actions/exec';

import gcloud from './gcloud-output';

let dnsProjectId;

const findDnsProject = async (dnsProjectLabel) =>
  gcloud([
    'projects',
    'list',
    `--filter=labels:${dnsProjectLabel}`,
    '--format=value(PROJECT_ID)',
  ]);

const dnsTransaction = async (domain, args) => {
  const zone = domain.split('.').slice(-2).join('-');
  return exec.exec('gcloud', [
    'dns',
    `--project=${dnsProjectId}`,
    'record-sets',
    'transaction',
    ...args,
    `--zone=${zone}`,
  ]);
};

const addDnsRecord = async (dnsProjectLabel, domain, ipAddress) => {
  core.info(`Create DNS record for: ${domain} ${ipAddress}`);

  if (dnsProjectLabel === 'none') {
    core.info("DNS update disabled with label 'none'.");
    return null;
  }

  if (!dnsProjectId) {
    dnsProjectId = await findDnsProject(dnsProjectLabel);
    if (!dnsProjectId) {
      core.error(
        `Could not find a project labeled '${dnsProjectLabel}'. DNS not updated.`,
      );
      return null;
    }
  }

  return dnsTransaction(domain, ['start'])
    .then(() =>
      dnsTransaction(domain, [
        'add',
        ipAddress,
        `--name=${domain}`,
        '--ttl=300',
        '--type=A',
      ]),
    )
    .then(() => dnsTransaction(domain, ['execute']));
};

const clearCache = () => {
  dnsProjectId = undefined;
};

module.exports = {
  addDnsRecord,
  clearCache,
};
