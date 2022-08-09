const crowdin = require('@crowdin/crowdin-api-client');

const crowdinClient = async (crowdinToken) => {
  const {
    projectsGroupsApi,
    sourceFilesApi,
    translationsApi,
    uploadStorageApi,
    screenshotsApi,
    // eslint-disable-next-line
  } = new crowdin.default({
    token: crowdinToken,
    organization: 'extenda',
  });

  return {
    projectsGroupsApi,
    sourceFilesApi,
    translationsApi,
    uploadStorageApi,
    screenshotsApi,
  };
};

module.exports = crowdinClient;
