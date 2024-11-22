const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const core = require('@actions/core');
const fg = require('fast-glob');

const baselineCompareFn = (a, b) => {
  if (a.endsWith('.gz') && b.endsWith('.gz')) {
    return 0;
  } else if (a.endsWith('.gz')) {
    return 1;
  } else if (b.endsWith('.gz')) {
    return -1;
  }
  return 0;
};

const decompress = async (baseline) => {
  const gz = zlib.createGunzip();
  const targetFile = baseline.replace('.gz', '');
  const output = fs.createWriteStream(targetFile);
  const input = fs.createReadStream(baseline);
  input.pipe(gz).pipe(output);
  await new Promise((resolve) => output.on('finish', resolve));
  return targetFile;
};

const findBaseline = async (projectDirectory) => {
  const baseline = fg
    .sync(['**/qodana.sarif.json', '**/qodana.sarif.json.gz'], {
      cwd: projectDirectory,
      dot: true,
      absolute: true,
    })
    .sort(baselineCompareFn);

  if (baseline.length === 0) {
    return '';
  } else if (baseline.length > 1) {
    core.warning(
      `Found multiple 'qodana.sarif.json'. Will use: ${baseline[0]}`,
    );
  }

  const match = baseline[0];

  return path.relative(
    projectDirectory,
    match.endsWith('.gz') ? await decompress(match) : match,
  );
};

module.exports = findBaseline;
