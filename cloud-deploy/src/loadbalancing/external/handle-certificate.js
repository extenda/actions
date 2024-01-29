const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');

const MAX_DOMAINS = 100;
const MAX_CERTIFICATES = 13;

const createCertificate = async (domains, projectID, name) => gcloudOutput([
  'compute',
  'ssl-certificates',
  'create',
  name,
  `--domains=${domains}`,
  `--project=${projectID}`,
  '--global',
]).then(() => core.info('Certificate already exists!'));

const deleteCertificateFromProxy = async (projectID, certificates) => gcloudOutput([
  'compute',
  'target-https-proxies',
  'update',
  'https-lb-proxy-external',
  `--ssl-certificates=${certificates.join(',')}`,
  `--project=${projectID}`,
]).then(() => core.info('Certificates updated successfully!'));

const deleteCertificate = async (projectID, name) => gcloudOutput([
  'compute',
  'ssl-certificates',
  'delete',
  name,
  `--project=${projectID}`,
  '--quiet',
  '--global',
]);

const listCertificates = async (clusterProject) => JSON.parse(await gcloudOutput([
  'compute',
  'ssl-certificates',
  'list',
  `--project=${clusterProject}`,
  '--filter=extenda-certs-v',
  '--format=json',
]));

const handleCertificates = async (hosts, project) => {
  const domainName = [...hosts];
  let firstCreatedDate = new Date();
  let firstCreatedName = '';

  let lastCreatedDate = new Date('2020-01-01T00:00:00.000Z');
  let lastCreatedDomains = [];
  let lastVersion = 0;

  const certificateList = await listCertificates(project);
  const certificateListNames = [];
  const totalCertificates = certificateList ? certificateList.length : 0;

  // temporary for iam-prod
  if (project === 'iam-prod-4aad') {
    certificateListNames.push('extenda-base-certificate');
  }

  for (const certificate of certificateList) {
    const version = parseInt(certificate.name.split('-')[2].substring(1), 10);
    const created = new Date(certificate.creationTimestamp);
    certificateListNames.push(certificate.name);

    if (firstCreatedDate > created && certificate.managed.domains.length < MAX_DOMAINS) {
      firstCreatedDate = created;
      firstCreatedName = certificate.name;
    }

    if (lastCreatedDate < created) {
      lastCreatedDate = created;
      lastCreatedDomains = certificate.managed.domains;
    }

    if (version > lastVersion) {
      lastVersion = version;
    }

    for (const domain of certificate.managed.domains) {
      for (const newDomains of domainName) {
        if (domain === newDomains) {
          const index = domainName.indexOf(newDomains);
          if (index !== -1) {
            domainName.splice(index, 1);
          }
          core.info(`Domain ${domain} exists in certificate`);
        }
      }
    }
  }

  if (domainName.length === 0) {
    return certificateListNames.join(',');
  }
  // create certificate with lastcreated domains plus new
  const newCertificateName = `extenda-certs-v${lastVersion + 1}`;
  let newDomains = lastCreatedDomains;
  newDomains.push(domainName);
  newDomains = newDomains.join(',');
  if (totalCertificates < MAX_CERTIFICATES) {
    await createCertificate(newDomains, project, newCertificateName);
  } else {
    certificateListNames.splice(certificateListNames.indexOf(firstCreatedName), 1);
    await deleteCertificateFromProxy(project, certificateListNames);
    await deleteCertificate(project, firstCreatedName);
    if (lastCreatedDomains.length < MAX_DOMAINS) {
      await createCertificate(newDomains, project, newCertificateName);
    } else {
      await createCertificate(domainName, project, newCertificateName);
    }
  }
  certificateListNames.push(newCertificateName);
  return certificateListNames.join(',');
};

module.exports = handleCertificates;
