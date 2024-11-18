const core = require('@actions/core');
const fg = require('fast-glob');

const findBaseline = (projectDirectory) => {
  const baseline = fg.sync('**/qodana.sarif.json', {
    cwd: projectDirectory,
    dot: true,
  });
  if (baseline.length === 0) {
    return '';
  } else if (baseline.length > 1) {
    core.warning(
      `Found multiple 'qodana.sarif.json'. Will use: ${baseline[0]}`,
    );
  }
  return baseline[0];
};

module.exports = findBaseline;
