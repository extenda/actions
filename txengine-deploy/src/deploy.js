const core = require('@actions/core');
const gcloudOutput = require('./gcloud-output');
const kubectl = require('./kubectl');
const checkStatusAndKillFailingPods = require('./rollback');

const getLatestRevision = async (revisionsList) => {
  const revisions = revisionsList.split(/[\r\n]+/);
  return parseInt(revisions[revisions.length - 1].trim(), 10);
};

const deploy = async ({ file, namespace, tenantName }) => {
  let rolloutFailed = false;

  // Fetch latest revision for rollback
  const latestRevision = await gcloudOutput(
    [
      'rollout',
      'history',
      'statefulset',
      `${tenantName}-txengine-service`,
      `--namespace=${namespace}`,
    ],
    'kubectl',
  )
    .then((revisionsList) => getLatestRevision(revisionsList))
    .catch(() =>
      core.info('No previous revision found! unable to rollback on failure'),
    );

  // Set timeout depending on replicas
  const replicas = await gcloudOutput(
    [
      'get',
      'statefulset',
      `${tenantName}-txengine-service`,
      `--namespace=${namespace}`,
      '--output=json',
    ],
    'kubectl',
  )
    .then(
      (statefulsetJson) => JSON.parse(statefulsetJson).status.currentReplicas,
    )
    .catch((err) => core.info(`Unable to read statefulset. ${err}`));
  const timeoutSeconds = !replicas || replicas < 2 ? 300 : replicas * 200;

  // Apply manifests
  await kubectl.exec(['apply', '-f', file]);

  // Check status and kill failing pods
  await checkStatusAndKillFailingPods(namespace);

  // Roll out
  await kubectl
    .exec([
      'rollout',
      'status',
      'statefulset',
      `${tenantName}-txengine-service`,
      `--timeout=${timeoutSeconds}s`,
      `--namespace=${namespace}`,
    ])
    .catch(() => {
      rolloutFailed = true;
    });

  // If rollout fails rollback and kill failing pods
  if (rolloutFailed) {
    core.info('issue found with deployment, rolling back to last revision');
    await kubectl
      .exec([
        'rollout',
        'undo',
        'statefulset',
        `${tenantName}-txengine-service`,
        `--to-revision=${latestRevision}`,
        `--namespace=${namespace}`,
      ])
      .then(() => checkStatusAndKillFailingPods(namespace))
      .catch((err) => {
        throw new Error(`Unable to undo rollout! ${err}`);
      });
    throw new Error('Deployment failed, Rollback was initiated!');
  }
};

module.exports = deploy;
