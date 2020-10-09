const parseEnvironmentArgs = (environment, projectId) => {
  const args = {};
  Object.keys(environment || {}).forEach((name) => {
    const value = environment[name]
      .replace('sm://*/', `sm://${projectId}/`);
    args[name] = value;
  });
  return args;
};

module.exports = parseEnvironmentArgs;
