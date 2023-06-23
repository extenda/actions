const os = require('os');
const path = require('path');
const fs = require('fs');
const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');
const { v4: uuidv4 } = require('uuid');
const tc = require('@actions/tool-cache');
const createKeyFile = require('../../utils/src/create-key-file');
const getDownloadUrl = require('./download-url');
const getLatestVersion = require('./latest-version');

const copyCredentials = async (tmpKeyFile) => {
  if (!process.env.RUNNER_TEMP) {
    return tmpKeyFile;
  }
  const dest = path.join(process.env.RUNNER_TEMP, uuidv4());
  return io.cp(tmpKeyFile, dest).then(() => dest);
};

const configureGcloud = async (serviceAccountKey, exportCredentials) => {
  const gcloud = os.platform() === 'win32' ? 'gcloud.cmd' : 'gcloud';
  const tmpKeyFile = createKeyFile(serviceAccountKey);

  if (exportCredentials) {
    await copyCredentials(tmpKeyFile).then((keyFile) => {
      core.info('Export GOOGLE_APPLICATION_CREDENTIALS');
      core.exportVariable('GOOGLE_APPLICATION_CREDENTIALS', keyFile);
    });
  }

  await exec.exec(gcloud, [
    'components',
    'install',
    'gke-gcloud-auth-plugin',
    '--quiet',
    '--no-user-output-enabled',
  ]);

  await exec.exec(gcloud, [
    '--quiet',
    'auth',
    'activate-service-account',
    '--key-file',
    tmpKeyFile,
  ]);

  const { project_id: projectId = '' } = JSON.parse(fs.readFileSync(tmpKeyFile, 'utf8'));
  return projectId;
};

const setupGcloud = async (serviceAccountKey, version = 'latest', exportCredentials = false) => {
  let semver = version;
  if (!semver || semver === 'latest') {
    semver = await getLatestVersion();
    core.info(`Use latest gcloud version: ${semver}`);
  }
  const downloadUrl = getDownloadUrl(semver);

  const gcloudPath = await tc.downloadTool(downloadUrl);
  const extractedPath = await tc.extractTar(gcloudPath);
  const toolPath = await tc.cacheDir(extractedPath, 'gcloud', semver);

  const gcloudBinPath = path.join(toolPath, 'google-cloud-sdk', 'bin');
  core.addPath(gcloudBinPath);

  return configureGcloud(serviceAccountKey, exportCredentials)
    .then((projectId) => {
      core.exportVariable('CLOUDSDK_CORE_PROJECT', projectId);
      core.setOutput('project-id', projectId);
      core.exportVariable('GCLOUD_INSTALLED_VERSION', semver);
      core.exportVariable('USE_GKE_GCLOUD_AUTH_PLUGIN', 'True');
      return projectId;
    });
};

module.exports = setupGcloud;
