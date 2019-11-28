const checkEnv = require('./check-env');
const gitConfig = require('./git-config');
const loadTool = require('./load-binary');

// Note that src/versions are NOT included here because it adds 2.2MBs to every package
// that uses the utils module. If versions are to be used, include the file explicitly.

module.exports = {
  checkEnv,
  gitConfig,
  loadTool,
};
