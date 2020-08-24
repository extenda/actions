const core = require('@actions/core');
const JiraClient = require('jira-client');
const semver = require('semver');
const { findJiraChanges } = require('../../jira-releasenotes/src/jira-releasenotes');

const releaseName = (projectKey, component, version) => {
  const release = [projectKey];
  if (component) {
    release.push(`(${component})`);
  }

  const cleanVersion = semver.clean(version);
  if (cleanVersion === null) {
    throw new Error(`'${version}' is not a semantic version`);
  }

  release.push(cleanVersion);
  return release.join(' ');
};

const getOrCreateRelease = async (client, { key, id }, name) => {
  const releases = await client.getVersions(key);
  const existingRelease = releases.find((release) => release.name === name);
  if (existingRelease) {
    core.info(
      `JIRA Release '${name}' already exists and is ${existingRelease.released ? 'released' : 'unreleased'}`,
    );
    return existingRelease;
  }
  core.info(`Create new JIRA release '${name}'`);
  return client.createVersion({
    name,
    description: 'Created by GitHub Actions.',
    projectId: id,
  });
};

const createUpdate = ({ id }) => ({
  update: {
    fixVersions: [
      { add: { id } },
    ],
  },
});

const createJiraRelease = async ({
  protocol,
  host,
  projectKey,
  component,
  version,
}) => {
  const client = new JiraClient({
    protocol,
    host,
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_PASSWORD,
    apiVersion: '2',
    strictSSL: protocol === 'https',
  });

  const name = releaseName(projectKey, component, version);

  const project = await client.getProject(projectKey);

  if (component && !project.components.find((list) => list.name === component)) {
    throw new Error(`'${component}' is not a valid JIRA component in project '${projectKey}'`);
  }

  const release = await getOrCreateRelease(client, project, name);

  const changes = await findJiraChanges(projectKey);
  const requests = [];
  Object.keys(changes).forEach((issueKey) => {
    requests.push(
      client.updateIssue(issueKey, createUpdate(release)).then(() => {
        core.info(`Issue ${issueKey} was updated with fix version`);
      }),
    );
  });
  await Promise.all(requests);

  if (!release.released) {
    core.info(`Release version ${name}`);
    await client.updateVersion({
      id: release.id,
      projectId: release.projectId,
      releaseDate: new Date().toISOString().split('T')[0],
      released: true,
    }).then(() => {
      core.info(`Version ${name} is now released`);
    }).catch((err) => {
      core.error(`Failed to release version ${name}. It must be manually released in JIRA. Reason: ${err.message}`);
      return null;
    });
  } else {
    core.warning(`Version ${name} was already released in JIRA`);
  }

  // Return the release name
  return name;
};

module.exports = {
  createJiraRelease,
};
