/**
 * Creates dictionary of environmental variables from the provided definition.
 * @param environment Definition of environmental variables (part of service definition).
 * @param projectId Project id in GCP. 
 * Is used to determine values for SERVICE_PROJECT_ID and SERVICE_ENVIRONMENT.
 * @returns A dictionary of environmental variables where the key equals 
 * the name of the variable and value equals its value.
 */
const parseEnvironmentArgs = (environment, projectId) => {
  const args = {};
  Object.keys(environment || {}).forEach((name) => {
    const value = environment[name]
      .replace('sm://*/', `sm://${projectId}/`);
    args[name] = value;
  });
  args.SERVICE_PROJECT_ID = projectId;
  args.SERVICE_ENVIRONMENT = projectId.includes('-staging-') ? 'staging' : 'prod';
  return args;
};

module.exports = parseEnvironmentArgs;
