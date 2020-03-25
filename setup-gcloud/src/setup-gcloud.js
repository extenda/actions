const os = require('os');
const path = require('path');
const fs = require('fs');
const core = require('@actions/core');
const exec = require('@actions/exec');
const { loadTool } = require('../../utils');
const createKeyFile = require('../../utils/src/create-key-file');
const getDownloadUrl = require('./download-url');
const getLatestVersion = require('./latest-version');

const configureGcloud = async (serviceAccountKey) => {
  const gcloud = os.platform() === 'win32' ? 'gcloud.cmd' : 'gcloud';
  const jsonKeyFile = createKeyFile(serviceAccountKey);
  await exec.exec(gcloud, [
    '--quiet',
    'auth',
    'activate-service-account',
    '--key-file',
    jsonKeyFile,
  ]);

  const { project_id: projectId = '' } = JSON.parse(fs.readFileSync(jsonKeyFile, 'utf8'));
  return projectId;
};

const setupGcloud = async (serviceAccountKey, version = 'latest') => {
  let semver = version;
  if (!semver || semver === 'latest') {
    semver = await getLatestVersion();
    core.info(`Use latest gcloud version: ${semver}`);
  }
  const downloadUrl = getDownloadUrl(semver);

  return loadTool({
    tool: 'gcloud',
    binary: 'google-cloud-sdk',
    version: semver,
    downloadUrl,
  }).then((gcloud) => {
    core.addPath(path.join(gcloud, 'bin'));
    return configureGcloud(serviceAccountKey);
  }).then((projectId) => {
    core.setOutput('project-id', projectId);
    core.exportVariable('GCLOUD_INSTALLED_VERSION', semver);
    return projectId;
  });
};

module.exports = setupGcloud;
