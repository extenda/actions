const parseEnvironmentArgs = (environment, projectId) => {
  const args = {};
  Object.keys(environment || {}).forEach((name) => {
    const value = environment[name]
      .replace('sm://*/', `sm://${projectId}/`);
    args[name] = value;
  });
  args[SERVICE_PROJECT_ID] = projectId;
  args[SERVICE_ENVIRONMENT] = projectId.includes('-staging-') ? 'staging' : 'prod';
  return args;
};

module.exports = parseEnvironmentArgs;
