const github = require('@actions/github');
const core = require('@actions/core');
const yaml = require('js-yaml');
const projectInfo = require('../../cloud-run/src/project-info');
const getClusterInfo = require('../../cloud-run/src/cluster-info');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');

const gcloudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const getSystemOwners = async (githubToken, serviceAccountKey) => {
  const octokit = github.getOctokit(githubToken);
  const projectId = await gcloudAuth(serviceAccountKey);
  const { project: clan } = projectInfo(projectId);
  const cluster = await getClusterInfo(projectId, undefined);
  const { project: tribe } = projectInfo(cluster.project);

  const clanYamlFile = await octokit.repos.getContent({
    owner: 'extenda',
    repo: 'tf-infra-gcp',
    path: `organization/extendaretail-com/departments/product-development/${tribe}/clans/${clan}/clan.yaml`,
  }).then((response) => Buffer.from(response.data.content, 'base64').toString('utf8'))
    .catch((err) => {
      core.error(`Failed to load clan.yaml Reason: ${err.message}`);
      throw new Error('clan.yaml file not found. not permitted.');
    });

  const clanEmails = [];
  const clanYaml = yaml.safeLoad(clanYamlFile);
  Object.keys(clanYaml.members.users).forEach((user) => {
    clanEmails.push(clanYaml.members.users[user].email);
  });

  return clanEmails;
};

module.exports = getSystemOwners;
