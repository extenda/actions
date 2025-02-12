const path = require('path');
const fs = require('fs');
const core = require('@actions/core');
const io = require('@actions/io');
const { restoreCache, saveCache } = require('@actions/cache');
const glob = require('fast-glob');
const { v4: uuid } = require('uuid');
const { loadTool } = require('../../utils');
const createKeyFile = require('../../utils/src/create-key-file');
const getDownloadUrl = require('./download-url');
const getLatestVersion = require('./latest-version');
const { execGcloud } = require('./exec-gcloud');

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

/**
 * Add gcloud to the path.
 * @param toolPath the cached tool path
 * @returns {Promise<string>} the tool path directory
 */
const updatePath = async (toolPath) => {
  const binPath = path.join(toolPath, 'bin');
  core.info(`Add ${binPath} to PATH`);
  core.addPath(binPath);
  return toolPath;
};

/**
 * Install additional gcloud components. This method only runs if gcloud isn't cached.
 * Remember to bump the CACHE_VERSION constant if you modify this method.
 * @param toolPath the gcloud tool path
 * @returns {Promise<void>} a promise completed with gcloud
 */
const installComponents = async (toolPath) => {
  await execGcloud([
    'components',
    'install',
    'gke-gcloud-auth-plugin',
    'beta',
    '--quiet',
    '--no-user-output-enabled',
  ]).then(() => {
    core.exportVariable('USE_GKE_GCLOUD_AUTH_PLUGIN', 'True');
    return null;
  });
  // Ensure install backups are empty.
  const installBackup = path.join(toolPath, '.install', '.backup');
  if (fs.existsSync(installBackup)) {
    fs.rmSync(installBackup, { recursive: true });
    fs.mkdirSync(installBackup, { recursive: true });
  }
  glob
    .sync('**/__pycache__', {
      cwd: toolPath,
      dot: true,
      onlyDirectories: true,
      absolute: true,
    })
    .forEach((pycache) => {
      fs.rmSync(pycache, { recursive: true });
    });
  return null;
};

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

  const { project_id: projectId = '' } = JSON.parse(
    fs.readFileSync(tmpKeyFile, 'utf8'),
  );

  core.exportVariable('CLOUDSDK_CORE_PROJECT', projectId);
  return projectId;
};

const setupGcloud = async (
  serviceAccountKey,
  version = 'latest',
  exportCredentials = false,
) => {
  // Optimize to only restore gcloud if version is mismatched.
  if (process.env.GCLOUD_REQUESTED_VERSION === version) {
    core.info(
      `Reuse already installed gcloud (requested=${version}, actual=${process.env.GCLOUD_INSTALLED_VERSION})`,
    );
  } else {
    // Restore from cache or install on cache-miss.
    const gcloudVersion = await getGcloudVersion(version);
    const toolInfo = {
      tool: 'gcloud',
      binary: 'google-cloud-sdk',
      version: gcloudVersion,
    };
    const cachePath = path.join(
      process.env.RUNNER_TOOL_CACHE,
      toolInfo.tool,
      gcloudVersion,
      process.env.RUNNER_ARCH.toLowerCase(),
      toolInfo.binary,
    );
    const cacheKey = `${process.env.RUNNER_OS}-${process.env.RUNNER_ARCH}-gcloud-cache-${gcloudVersion}-v${CACHE_VERSION}`;

    const restoredKey = await restoreCache([cachePath], cacheKey);
    if (restoredKey === undefined) {
      core.info(`Install gcloud ${gcloudVersion}`);
      const downloadUrl = getDownloadUrl(gcloudVersion);
      await loadTool({
        ...toolInfo,
        downloadUrl,
      })
        .then(updatePath)
        .then(installComponents)
        .then(() => {
          try {
            return saveCache([cachePath], cacheKey);
          } catch (err) {
            core.error(`Failed to invoke saveCache. Message: ${err.message}`);
          }
        })
        .then((n) => {
          core.debug(`Saved cache with cacheId=${n}`);
        })
        .catch((err) => {
          core.error(
            `Failed to save cache. Continue anyways. Message: ${err.message}`,
          );
        });
    } else {
      core.info(`Use cached gcloud ${gcloudVersion}`);
      await updatePath(cachePath);
    }

    core.exportVariable('GCLOUD_REQUESTED_VERSION', version);
    core.exportVariable('GCLOUD_INSTALLED_VERSION', gcloudVersion);
  }

  // We always authenticate to not accidentally reuse incorrect credentials.
  return authenticateGcloud(serviceAccountKey, exportCredentials).then(
    (projectId) => {
      core.setOutput('project-id', projectId);
      return projectId;
    },
  );
};

module.exports = setupGcloud;
