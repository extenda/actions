const gcloudOutput = require('../utils/gcloud-output');
const kubectl = require('../utils/kubectl');
const { backupManifest } = require('./build-manifest');


const applyManifest = async (name) => {
  
  let rolloutFailed = false;
  // Apply manifests
  const backupYaml = await gcloudOutput(['get', 'deploy', name, '-n', name, '-o=yaml'], 'kubectl');
  await backupManifest(backupYaml);
  await kubectl.exec(['apply', '-f', 'manifest.yaml']);
  await kubectl.exec(['wait', 'pods', `--namespace=${name}`, '-l', `app=${name}`, '--for', 'condition=Ready', '--timeout=180s']);
};

const deploy = async (name) => {
  await applyManifest(name);
}

module.exports = deploy;