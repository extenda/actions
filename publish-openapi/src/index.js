const core = require('@actions/core');
const { run } = require('../../utils/src');
const deployDocumentation = require('./redoc');

const action = async () => {
  const yaml = core.getInput('openapi', { required: true });
  const apiName = core.getInput('api-name', { required: true });
  const version = core.getInput('release-tag', { required: true });
  const systemName = core.getInput('system-name', { required: true });
  const bucket = core.getInput('bucket') || 'gs://extenda-api-documentations/';

  await deployDocumentation(yaml, apiName, version, bucket, systemName);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
