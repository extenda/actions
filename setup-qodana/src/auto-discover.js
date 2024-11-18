const fg = require('fast-glob');

const NODE = {
  ide: 'QDJS',
};

const JVM = {
  ide: 'QDJVM',
};

const DOTNET = {
  ide: 'QDNET',
};

const UNKNOWN = {
  ide: '',
};

const isMatch = (glob, cwd) => {
  const matches = fg.sync(glob, { cwd, ignore: ['**/node_modules'] });
  return matches.length > 0;
};

const autoDiscover = (projectDirectory) => {
  if (
    isMatch('**/pom.xml', projectDirectory) ||
    isMatch('**/build.gradle', projectDirectory)
  ) {
    return JVM;
  }

  if (
    isMatch('**/package.json', projectDirectory) ||
    isMatch('**/yarn.lock', projectDirectory)
  ) {
    return NODE;
  }

  if (isMatch('**/*.cs', projectDirectory)) {
    return DOTNET;
  }

  return UNKNOWN;
};

module.exports = {
  projectType: {
    DOTNET,
    JVM,
    NODE,
    UNKNOWN,
  },
  autoDiscover,
};
