const exec = require('@actions/exec');
const core = require('@actions/core');

const MAX_DOMAINS = 100;
const MAX_CERTIFICATES = 13;

const gcloudOutput = async (args, bin = 'gcloud') => {
  let output = '';
  await exec.exec(bin, args, {
    silent: false,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  return output.trim();
};

// Create certificate containing old domains and new
const createCertificate = async (domains, projectID, name) => gcloudOutput([
  'compute',
  'ssl-certificates',
  'create',
  name,
  `--domains=${domains}`,
  `--project=${projectID}`,
  '--global',
]);

const deleteCertificate = async (projectID, name) => gcloudOutput([
  'compute',
  'ssl-certificates',
  'delete',
  name,
  `--project=${projectID}`,
  '--global',
]);

const listCertificates = async (clusterProject) => JSON.parse(await gcloudOutput([
  'compute',
  'ssl-certificates',
  'list',
  `--project=${clusterProject}`,
  '--filter=txengine-certs-',
  '--format=json',
]));

const handleCertificates = async (domainName, project) => {
  let firstCreatedDate = new Date();
  let firstCreatedName = '';

  let lastCreatedDate = new Date('2020-01-01T00:00:00.000Z');
  let lastCreatedDomains = [];
  let lastVersion = 0;

  const certificateList = await listCertificates(project);
  const certificateListNames = [];
  const totalCertificates = certificateList.length;

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
      if (domain === domainName) {
        core.info('Domain exists in certificate');
        return '';
      }
    }
  }

  // create certificate with lastcreated domains plus new
  const newCertificateName = `txengine-certs-v${lastVersion + 1}`;
  let newDomains = lastCreatedDomains;
  newDomains.push(domainName);
  newDomains = newDomains.join(',');
  if (totalCertificates < MAX_CERTIFICATES) {
    await createCertificate(newDomains, project, newCertificateName);
  } else {
    certificateListNames.splice(certificateListNames.indexOf(firstCreatedName), 1);
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
