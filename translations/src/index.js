const { run } = require('../../utils');
const core = require('@actions/core');
const crowdin = require('@crowdin/crowdin-api-client');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });

  const crowdinToken = await loadSecret(serviceAccountKey, 'crowdin-token');

  const {
    projectsGroupsApi,
    uploadStorageApi,
    sourceFilesApi,
    translationsApi
  } = new crowdin.default({
    token: crowdinToken,
    organization: 'extenda'
  });

  const createProject = await projectsGroupsApi.addProject({name: 'my-project', sourceLanguageId: 'English'});
  console.log(createProject);

};

if (require.main === module) {
  run(action);
}

module.exports = action;