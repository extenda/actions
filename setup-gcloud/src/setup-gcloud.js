const path = require('path');
const fs = require('fs');
const core = require('@actions/core');
const io = require('@actions/io');
const { restoreCache, saveCache } = require('@actions/cache');
const { v4: uuid } = require('uuid');
const { loadTool } = require('../../utils');
const createKeyFile = require('../../utils/src/create-key-file');
const getDownloadUrl = require('./download-url');
const getLatestVersion = require('./latest-version');
const execGcloud = require('./exec-gcloud');

// Increment this version if the list of installed components are modified.
const CACHE_VERSION = '1';

/**
 * Copy the credentials file outside the working directory. We want to store
 * in a directory that is hard to accidentally include in docker contexts or
 * gcloud tarballs.
 *
 * @param tmpKeyFile the temporary credentials key file
 * @returns {Promise<string|*>} the path to the created credentials file
 */
const copyCredentials = async (tmpKeyFile) => {
  if (!process.env.RUNNER_TEMP) {
    return tmpKeyFile;
  }
  const dest = path.join(process.env.RUNNER_TEMP, uuid());
  return io.cp(tmpKeyFile, dest).then(() => dest);
};

const getGcloudVersion = async (providedVersion) => {
  let semver = providedVersion;
  if (!semver || semver === 'latest') {
    semver = await getLatestVersion();
    core.info(`Use latest gcloud version: ${semver}`);
  }
  return semver;
};

const updatePath = async (cachePath) => {
  core.addPath(path.join(cachePath, 'bin'));
};

/**
 * Install additional gcloud components. This method only runs if gcloud isn't cached.
 * Remember to bump the CACHE_VERSION constant if you modify this method.
 *
 * @returns {Promise<void>} a promise completed with gcloud
 */
const installComponents = async () => execGcloud([
  'components',
  'install',
  'gke-gcloud-auth-plugin',
  '--quiet',
  '--no-user-output-enabled',
]).then(() => {
  core.exportVariable('USE_GKE_GCLOUD_AUTH_PLUGIN', 'True');
  return null;
});

/**
 * Authenticate gcloud with provided service account.
 * @param serviceAccountKey the service account key
 * @param exportCredentials flag indicating if credentials env var should be exported
 * @returns {Promise<string>} a promise that completes with the project ID
 */
const authenticateGcloud = async (serviceAccountKey, exportCredentials) => {
  const tmpKeyFile = createKeyFile(serviceAccountKey);

  await execGcloud([
    '--quiet',
    'auth',
    'activate-service-account',
    '--key-file',
    tmpKeyFile,
  ]);

  if (exportCredentials) {
    await copyCredentials(tmpKeyFile).then((keyFile) => {
      core.info('Export GOOGLE_APPLICATION_CREDENTIALS');
      core.exportVariable('GOOGLE_APPLICATION_CREDENTIALS', keyFile);
    });
  }

  const { project_id: projectId = '' } = JSON.parse(fs.readFileSync(tmpKeyFile, 'utf8'));

  core.exportVariable('CLOUDSDK_CORE_PROJECT', projectId);
  return projectId;
};

const setupGcloud = async (serviceAccountKey, version = 'latest', exportCredentials = false) => {
  const gcloudVersion = await getGcloudVersion(version);
  const cachePath = path.join(process.env.RUNNER_TOOL_CACHE, 'gcloud', gcloudVersion);
  const cacheKey = `${process.env.RUNNER_OS}-gcloud-cache-${gcloudVersion}-v${CACHE_VERSION}`;

  const restoredKey = await restoreCache([cachePath], cacheKey);
  if (restoredKey === undefined) {
    core.info(`Install gcloud ${gcloudVersion}`);
    const downloadUrl = getDownloadUrl(gcloudVersion);
    await loadTool({
      tool: 'gcloud',
      binary: 'google-cloud-sdk',
      version: gcloudVersion,
      downloadUrl,
    }).then(() => updatePath(cachePath))
      .then(() => installComponents())
      .then(() => saveCache([cachePath], cacheKey));
  } else {
    core.info(`Use cached gcloud ${gcloudVersion}`);
    await updatePath(cachePath);
  }

  core.exportVariable('GCLOUD_INSTALLED_VERSION', gcloudVersion);

  return authenticateGcloud(serviceAccountKey, exportCredentials)
    .then((projectId) => {
      core.setOutput('project-id', projectId);
      return projectId;
    });
};

module.exports = setupGcloud;