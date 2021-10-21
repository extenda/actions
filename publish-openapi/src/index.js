const core = require('@actions/core');
const { run } = require('../../utils/src');

const action = async () => {
  /* eslint-disable no-unused-vars */
  const yaml = core.getInput('openapi', { required: true });
  const apiName = core.getInput('api-name', { required: true });
  const version = core.getInput('release-tag', { required: true });
  const systemName = core.getInput('system-name', { required: true });
  const bucket = core.getInput('bucket') || 'gs://extenda-api-documentations/';
  /* eslint-enable no-unused-vars */

  core.info('THIS ACTION HAS BEEN DEPRECATED');
  core.info('Information for the developer portal:');
  core.info('https://github.com/extenda/hiiretail-developer-docs#hii-retail-developer-portal');

  // await deployDocumentation(yaml, apiName, version, bucket, systemName);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
