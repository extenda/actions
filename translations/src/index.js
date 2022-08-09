const core = require('@actions/core');
const { run } = require('../../utils');

const loadSpecDefinition = require('./load-definition');
const { handleProject } = require('./handle-project');
const uploadFiles = require('./upload-files');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const crowdinFile = core.getInput('translations-definition') || 'translations.yaml';

  const githubToken = await loadSecret(serviceAccountKey, 'github-token');
  const crowdinToken = await loadSecret(serviceAccountKey, 'crowdin-token');

  const spec = loadSpecDefinition(crowdinFile);

  await handleProject(crowdinToken, spec);

  await uploadFiles(githubToken, crowdinToken, spec);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
