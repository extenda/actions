const path = require('path');
const fg = require('fast-glob');
const {
  projectType: { DOTNET, JVM, NODE },
} = require('./auto-discover');

const findCoverageDir = (glob, cwd) =>
  fg
    .sync(glob, {
      cwd,
      dot: true,
      onlyFiles: true,
      ignore: ['**/node_modules'],
    })
    .map((file) => path.dirname(file))
    .reduce((coverageDir, dir) => {
      if (!coverageDir) {
        return dir;
      }
      if (!dir.startsWith(coverageDir)) {
        const covPaths = coverageDir.split(path.sep);
        const dirPaths = dir.split(path.sep);
        const commonPaths = [];
        for (let i = 0; i < dirPaths.length; i++) {
          if (covPaths.length > i && dirPaths[i] === covPaths[i]) {
            commonPaths.push(dirPaths[i]);
          } else {
            break;
          }
        }
        if (commonPaths.length > 0) {
          return path.join(...commonPaths);
        }
      }
      return coverageDir;
    }, '');

const coverageDirectory = (projectType, projectDirectory) => {
  switch (projectType) {
    case DOTNET:
    case NODE:
      return findCoverageDir('**/lcov.info', projectDirectory);
    case JVM: {
      let jacoco = findCoverageDir(
        '**/target/site/jacoco-aggregate/jacoco.xml',
        projectDirectory,
      );
      if (!jacoco) {
        jacoco = findCoverageDir(
          '**/target/site/jacoco/jacoco.xml',
          projectDirectory,
        );
      }
      return jacoco;
    }
    default:
      return '';
  }
};

module.exports = coverageDirectory;
