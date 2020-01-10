const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const path = require('path');
const axios = require('axios');
const uuid = require('uuid/v4');
const fs = require('fs');
const os = require('os');

const find = async ({ tool, binary, version }) => Promise.resolve(
  tc.find(tool, version), /* process.arch), */
).then((dir) => (dir ? path.join(dir, binary) : ''));

const nexusDownload = async (url) => {
  const targetFile = path.join(os.tmpdir(), uuid(), uuid());
  fs.mkdirSync(path.dirname(targetFile));
  const stream = fs.createWriteStream(targetFile);
  await axios({
    url,
    method: 'get',
    auth: {
      username: process.env.NEXUS_USERNAME,
      password: process.env.NEXUS_PASSWORD,
    },
    responseType: 'stream',
  }).then((response) => {
    core.info(`Loading ${response.headers['content-length'] / 1000} KB...`);
    response.data.pipe(stream);
    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }).then(() => {
    core.info(`Binary saved to ${targetFile}`);
    fs.chmodSync(targetFile, '0777');
  });
  return targetFile;
};

const internalDownload = async (url) => {
  if (url.startsWith('https://repo.extendaretail.com')) {
    return nexusDownload(url);
  }
  return tc.downloadTool(url);
};

const downloadIfMissing = async (options, cachedTool) => {
  if (!cachedTool) {
    const {
      tool, binary, version, downloadUrl, downloadFn,
    } = options;
    core.info(`Downloading ${tool} from ${downloadUrl}`);
    const downloadUuid = await downloadFn(downloadUrl);
    const tmpDir = path.dirname(downloadUuid);
    const tmpFile = path.join(tmpDir, binary);
    await io.cp(downloadUuid, tmpFile);
    await tc.cacheDir(tmpDir, tool, version);
    return find(options);
  }
  return cachedTool;
};

const loadTool = async ({
  tool, binary, version, downloadUrl, downloadFn = internalDownload,
}) => {
  const options = {
    tool, binary, version, downloadUrl, downloadFn,
  };
  return find(options).then((cachedTool) => downloadIfMissing(options, cachedTool));
};

module.exports = loadTool;
