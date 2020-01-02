const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const path = require('path');

const find = async ({ tool, binary, version }) => Promise.resolve(
  tc.find(tool, version), /* process.arch), */
)
  .then((dir) => (dir ? path.join(dir, binary) : ''));

const downloadIfMissing = async (options, cachedTool) => {
  if (!cachedTool) {
    const {
      tool, binary, version, downloadUrl,
    } = options;
    core.info(`Downloading ${tool} from ${downloadUrl}`);
    const downloadUuid = await tc.downloadTool(downloadUrl);
    const tmpDir = path.dirname(downloadUuid);
    const tmpFile = path.join(tmpDir, binary);
    await io.cp(downloadUuid, tmpFile);
    await tc.cacheDir(tmpDir, tool, version);
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

module.exports = loadTool;
