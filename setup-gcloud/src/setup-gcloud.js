const os = require('os');
const path = require('path');
const fs = require('fs');
const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');
const cache = require('@actions/cache');
const toolCache = require('@actions/tool-cache');
const { v4: uuidv4 } = require('uuid');
const { loadTool } = require('../../utils');
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

const setupGcloud = async (serviceAccountKey, useCache, version = 'latest', exportCredentials = false) => {
  let semver = version;
  const TOOL_NAME = 'gcloud';
  if (!semver || semver === 'latest') {
    semver = await getLatestVersion();
    core.info(`Use latest gcloud version: ${semver}`);
  }
  const downloadUrl = getDownloadUrl(semver);

  const cachedPath = toolCache.find(TOOL_NAME, semver);
  if (cachedPath) {
    core.info(`Using cached gcloud install: ${cachedPath}`);
  }

  const cacheKey = `${TOOL_NAME}-${semver}`;
  if (useCache) {
    const restorePath = path.join(process.env.RUNNER_TOOL_CACHE, TOOL_NAME, semver, os.arch());
    core.info(`Attempting restore of ${cacheKey} to ${restorePath}`);
    const restoredKey = await cache.restoreCache([restorePath], cacheKey);
    if (restoredKey) {
      core.info(`Using cached gcloud install: ${restorePath}`);
    } else {
      core.info(`No cached version found. Downloading gcloud ${semver}`);

      const gcloud = await loadTool({
        tool: 'gcloud',
        binary: 'google-cloud-sdk',
        version: semver,
        downloadUrl,
      });

      const binPath = path.join(gcloud, 'bin');
      const cachePath = await toolCache.cacheDir(binPath, TOOL_NAME, semver);

      if (useCache) {
        core.info(`Adding gcloud ${semver} at ${cachePath} to local cache ${cacheKey}`);
        await cache.saveCache([cachePath], cacheKey);
      }
    }
  }

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
