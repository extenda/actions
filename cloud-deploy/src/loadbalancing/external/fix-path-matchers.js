const gcloudOutput = require('../../utils/gcloud-output');
const { projectWithoutNumbers } = require('../../utils/clan-project-name');

const removePathMatcher = async (projectID, env, name) => gcloudOutput([
  'compute',
  'url-maps',
  'remove-path-matcher',
  `${projectWithoutNumbers(projectID, env)}-lb-external`,
  `--path-matcher-name=${name}`,
  `--project=${projectID}`,
]).catch(() => true);

const checkURLMap = async (projectID, env) => gcloudOutput([
  'compute',
  'url-maps',
  'describe',
  `${projectWithoutNumbers(projectID, env)}-lb-external`,
  `--project=${projectID}`,
  '--format=json',
]);

const fixPathMatchers = async (projectID, env, name) => {
  const backendServiceName = `${name}-external-backend`;
  const URLMapInfo = JSON.parse(await checkURLMap(projectID, env));
  const { pathMatchers } = URLMapInfo;

  // check all pathmatchers and remove incorrectly named ones
  const promises = [];
  if (pathMatchers) {
    for (const pathMatcher of pathMatchers) {
      const service = pathMatcher.defaultService.split('/').pop();
      const pathMatcherName = pathMatcher.name;

      if (service === backendServiceName) {
        if (pathMatcherName !== backendServiceName) {
          promises.push(removePathMatcher(projectID, env, pathMatcherName));
        }
      }
    }
  }
  return Promise.all(promises);
};

module.exports = fixPathMatchers;
