const github = require('@actions/github');
const core = require('@actions/core');
const yaml = require('js-yaml');
const fs = require('fs');
const projectInfo = require('../../cloud-run/src/project-info');
const { setupGcloud } = require('../../setup-gcloud');

const getTribe = () => {
  const commonHcl = fs.readFileSync('infra/common.hcl', 'utf-8');
  const tribeLine = commonHcl.split('\n').find((line) => line.match(/^\s+tribe_name/));
  return tribeLine.substring(tribeLine.indexOf('"') + 1, tribeLine.lastIndexOf('"'));
};

const getSystemOwners = async (githubToken, serviceAccountKey) => {
  const octokit = github.getOctokit(githubToken);
  const projectId = await setupGcloud(serviceAccountKey);
  const { project: clan } = projectInfo(projectId);
  const tribe = getTribe();

  const clanYamlFile = await octokit.rest.repos.getContent({
    owner: 'extenda',
    repo: 'tf-infra-gcp',
    path: `organization/extendaretail-com/departments/product-development/${tribe}/clans/${clan}/clan.yaml`,
  }).then((response) => Buffer.from(response.data.content, 'base64').toString('utf8'))
    .catch((err) => {
      core.error(`Failed to load clan.yaml Reason: ${err.message}`);
      throw new Error('clan.yaml file not found. not permitted.');
    });

  const clanEmails = [];
  const clanYaml = yaml.load(clanYamlFile);
  Object.keys(clanYaml.members.users).forEach((user) => {
    clanEmails.push(clanYaml.members.users[user].email);
  });

  return clanEmails;
};

module.exports = getSystemOwners;
