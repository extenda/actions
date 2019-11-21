const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const path = require('path');

const find = async ({ tool, binary, version }) => Promise.resolve(tc.find(tool, version))
  .then(dir => {
    console.log('cache hit', dir);
    return dir ? path.join(dir, binary) : '';
  });

const downloadIfMissing = async (options, cachedTool) => {
  if (!cachedTool) {
    const { tool, binary, version, downloadUrl } = options;
    core.info(`Downloading ${tool} from ${downloadUrl}`);
    const downloadUuid = await tc.downloadTool(downloadUrl);
    console.log('DownloadUuid', downloadUuid);
    const tmpDir = path.dirname(downloadUuid);
    const tmpFile = path.join(tmpDir, binary);
    await io.cp(downloadUuid, tmpFile);
    console.log('dir =>', tmpDir, 'nuget.exe => ', tmpFile);
    const cached = await tc.cacheDir(tmpDir, tool, version);
    console.log('cached', cached);
    return find(options);
  }
  return cachedTool;
};

const loadTool = async ({ tool, binary, version, downloadUrl }) => {
  const options = { tool, binary, version, downloadUrl };
  return find(options).then(cachedTool => downloadIfMissing(options, cachedTool));
};

module.exports = loadTool;
