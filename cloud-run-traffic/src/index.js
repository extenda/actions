const core = require('@actions/core');
const { run } = require('../../utils/src');
const { setupGcloud, execGcloud } = require('../../setup-gcloud');

function validatePercentage(_percentage) {
  const percentage = +_percentage;

  if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
    throw new Error('Percentage must be a valid number between 0 and 100');
  }

  return percentage;
}

function routeTraffic(service, targetRevision, percentage, projectId) {
  return execGcloud([
    'run',
    'services',
    'update-traffic',
    service,
    `--to-revisions=${targetRevision}=${percentage}`,
    '--region=europe-west1',
    `--project=${projectId}`,
  ]);
}

async function action() {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const service = core.getInput('service', { required: true });
  const targetRevision = core.getInput('target-revision', { required: true });
  const percentage = validatePercentage(core.getInput('percentage') || '100');

  const projectId = await setupGcloud(serviceAccountKey);

  await routeTraffic(service, targetRevision, percentage, projectId);
}

if (require.main === module) {
  run(action);
}

module.exports = action;
