const gcloudOutput = require('../../utils/gcloud-output');
const kubectl = require('../../utils/kubectl');
const { backupManifest } = require('./build-manifest');
const core = require('@actions/core');

const applyManifest = async (name, version) => {

  let backup = true;
  let rolloutFailed = false;

  // Apply manifests
  const backupYaml = await gcloudOutput(['get', 'deploy', name, '-n', name, '-o=yaml'], 'kubectl').catch(() => {
    core.info("Unable to create backup yaml")
    backup = false;
  });
  if (backup) {
    await backupManifest(backupYaml);

  }
  await kubectl.exec(['apply', '-f', 'manifest.yaml']);

  // ToDO, implement a better wait for deploy and handling rollback
  let rolloutResult = await kubectl.exec(['rollout', 'status', `deployment/${name}`, `--namespace=${name}`]);
};

const deploy = async (name, version) => {
  await applyManifest(name, version);
}

module.exports = deploy;