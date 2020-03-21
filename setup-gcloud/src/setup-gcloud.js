const os = require('os');
const core = require('@actions/core');
const exec = require('@actions/exec');
const { loadTool } = require('../../utils');
const createKeyFile = require('../../utils/src/create-key-file');
const getDownloadUrl = require('./download-url');
const getLatestVersion = require('./latest-version');

const configureGcloud = async (gcloud, serviceAccountKey) => {
  await exec.exec(gcloud, [
    '--quiet',
    'auth',
    'activate-service-account',
    '--key-file',
    createKeyFile(serviceAccountKey),
  ]);

  let projectOutput = '';
  await exec.exec(gcloud, [
    'config',
    'list',
    '--format',
    "'value(core.project)'",
  ], {
    listeners: {
      stdout: (data) => {
        projectOutput += data.toString('utf8');
      },
    },
  });
  const projectId = projectOutput.trim();
  core.setOutput('project-id', projectId);
  return projectId;
};

const setupGcloud = async (serviceAccountKey, version = 'latest') => {
  let semver = version;
  if (!semver || semver === 'latest') {
    semver = await getLatestVersion();
    core.info(`Use latest gcloud version: ${semver}`);
  }
  const binary = os.platform() === 'win32' ? 'gcloud.cmd' : 'gcloud';
  const downloadUrl = getDownloadUrl(semver);

  return loadTool({
    tool: 'gcloud',
    binary,
    version: semver,
    downloadUrl,
  }).then((gcloud) => configureGcloud(gcloud, serviceAccountKey))
    .then((projectId) => {
      core.exportVariable('GCLOUD_INSTALLED_VERSION', semver);
      return projectId;
    });
};

module.exports = setupGcloud;
