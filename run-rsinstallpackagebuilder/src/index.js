const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const fs = require('fs');
const core = require('@actions/core');
const exec = require('@actions/exec');
const path = require('path');
const uuidV4 = require('uuid/v4');
const https = require('https');
const { getBinaryName } = require('./pkgbuilder');
const { checkEnv } = require('../../utils');

const packageBuilderCommand = async (
  builder, type, packageName, workingDir, outputDir, sourcePaths, sourceFilePaths) => exec.exec(
  builder, type,
  [type, '-pn', packageName, '-wd', workingDir, '-od', outputDir, '-sp', sourcePaths, '-sfp', sourceFilePaths],
);

function downloadTool(url) {
  let urlObject;

  try {
    urlObject = new URL(url);
  } catch (error) {
    throw new Error(`Invalid url ${url}`);
  }

  return new Promise(((resolve, reject) => {
    let tempDirectory = process.env.RUNNER_TEMP || '';
    let cacheRoot = process.env.RUNNER_TOOL_CACHE || '';

    if (!tempDirectory || !cacheRoot) {
      let baseLocation;

      if (process.platform === 'win32') {
        baseLocation = process.env.USERPROFILE || 'C:\\';
      } else if (process.platform === 'darwin') {
        baseLocation = '/tmp';
      } else {
        baseLocation = '/home';
      }

      if (!tempDirectory) {
        tempDirectory = path.join(baseLocation, 'actions', 'temp', uuidV4());
      }

      if (!cacheRoot) {
        cacheRoot = path.join(baseLocation, 'actions', 'cache');
      }
    }

    const destPath = path.join(tempDirectory, uuidV4());

    core.debug(`Using temp directory: ${tempDirectory}`);
    core.debug(`Using dest file path: ${destPath}`);
    core.debug(`Using cache root directory: ${cacheRoot}`);

    if (fs.existsSync(destPath)) {
      throw new Error(`Destination file path ${destPath} already exists`);
    }

    const username = process.env.NEXUS_USERNAME;
    const password = process.env.NEXUS_PASSWORD;

    const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const options = {
      hostname: urlObject.hostname,
      port: urlObject.port,
      path: urlObject.pathname,
      method: 'GET',
      headers: {
        Authorization: auth,
      },
    };
    let file;

    core.debug(`Downloading ${url}`);
    core.debug(`Downloading file to: ${destPath}`);
    const req = https.request(options, (res) => {
      core.debug(`Result status code: ${res.statusCode}`);

      res.on('data', (d) => {
        file.write(d);
      });

      res.on('end', () => {
        core.debug('Download finished');
        file.end();
        resolve(destPath);
      });
    });

    req.on('error', (e) => {
      core.debug('Download failed');
      file.end();
      reject(e.message);
    });

    io.mkdirP(tempDirectory)
      .then(() => { file = fs.createWriteStream(destPath); }).then(() => { req.end(); });
  }));
}

const find = async ({ tool, binary, version }) => Promise.resolve(
  tc.find(tool, version, process.arch),
)
  .then((dir) => (dir ? path.join(dir, binary) : ''));

const downloadIfMissing = async (options, cachedTool) => {
  if (!cachedTool) {
    const {
      tool, binary, version, downloadUrl,
    } = options;

    core.info(`Downloading ${tool} (version ${version}) from ${downloadUrl}`);
    const downloadUuid = await downloadTool(downloadUrl);
    const tmpDir = path.dirname(downloadUuid);
    const tmpFile = path.join(tmpDir, binary);
    await io.mv(downloadUuid, tmpFile);
    await tc.cacheDir(tmpDir, tool, version, process.arch);

    return find(options);
  }
  return cachedTool;
};

const loadTool = async ({
  tool, binary, version, downloadUrl,
}) => {
  const options = {
    tool, binary, version, downloadUrl,
  };

  return find(options).then((cachedTool) => downloadIfMissing(options, cachedTool));
};

const run = async () => {
  const appName = 'RS.InstallerPackageBuilder.Core.Console';

  try {
    checkEnv(['INPUT_TYPE', 'INPUT_WORKING-DIR', 'INPUT_OUTPUT-DIR', 'INPUT_TOOL-VERSION', 'NEXUS_USERNAME', 'NEXUS_PASSWORD']);

    const pn = core.getInput('package-name', { required: false });
    const wd = core.getInput('working-dir', { required: true });
    const od = core.getInput('output-dir', { required: true });
    const sp = core.getInput('source-paths', { required: false });
    const sfp = core.getInput('source-filePaths', { required: false });
    const t = core.getInput('type', { required: false });
    const binaryVersion = core.getInput('tool-version', { required: true });

    const binaryName = await getBinaryName();
    const downloadUrlNexus = `https://repo.extendaretail.com/repository/raw-hosted/${appName}/${binaryVersion}/${binaryName}`;
    const builder = await loadTool({
      tool: 'InstallerPackageBuilder.Core.Console',
      binary: binaryName,
      version: binaryVersion,
      downloadUrl: downloadUrlNexus,
    });

    await packageBuilderCommand(builder, t, pn, wd, od, sp, sfp);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();

module.exports = {
  run,
};
