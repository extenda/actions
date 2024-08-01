const os = require('os');
const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const { extractTar } = require('@actions/tool-cache');

const OUT_BEGIN_MARKER = 'test-pod-output BEGIN';
const OUT_END_MARKER = 'test-pod-output END';

const getBinaryData = (rawOutput) => {
  const start = rawOutput.lastIndexOf(OUT_BEGIN_MARKER);
  const end = rawOutput.lastIndexOf(OUT_END_MARKER);
  if (start !== -1 && end > start) {
    const data = rawOutput.substring(start + OUT_BEGIN_MARKER.length + 1, end);
    return Buffer.from(data, 'base64');
  }
  return null;
};

const extractOutput = async (rawOutput) => {
  const data = getBinaryData(rawOutput);
  if (!data) {
    core.debug('No test-pod-output');
    return null;
  }
  core.info(
    `Unpack test-pod output. Buffer size: ${Buffer.byteLength(data, 'binary')} bytes`,
  );
  const tarFile = path.join(os.tmpdir(), `test-pod-output-${Date.now()}.tar`);
  fs.writeFileSync(tarFile, data, 'binary');
  return extractTar(tarFile, 'test-pod-output');
};

const LogFilter = function LogFilter() {
  this.logEnabled = true;
};

LogFilter.prototype.log = function log(data, stream) {
  const s = data.toString('utf8');
  if (!this.logEnabled && s.includes(OUT_END_MARKER)) {
    this.logEnabled = true;
  } else if (this.logEnabled && s.includes(OUT_BEGIN_MARKER)) {
    this.logEnabled = false;
  } else if (this.logEnabled) {
    stream.write(data);
  }
};

module.exports = {
  extractOutput,
  LogFilter,
};
