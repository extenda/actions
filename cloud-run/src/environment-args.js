const createEnvironmentArgs = (environment, projectId) => {
  const args = [];
  Object.keys(environment).forEach((name) => {
    const value = environment[name]
      .replace('sm://*/', `sm://${projectId}/`);
    args.push(`${name}="${value}"`);
  });
  return args.join(',');
};

module.exports = createEnvironmentArgs;
