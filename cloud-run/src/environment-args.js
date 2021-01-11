const createEnvironmentArgs = (environment, projectId) => {
  const args = [];
  Object.keys(environment).forEach((name) => {
    const value = environment[name]
      .replace('sm://*/', `sm://${projectId}/`);
    args.push(`${name}=${value}`);
  });
  args.push(`SERVICE_PROJECT_ID=${projectId}`);
  args.push(`SERVICE_ENVIRONMENT=${projectId.split('-')[1]}`);
  return args.join(',');
};

module.exports = createEnvironmentArgs;
