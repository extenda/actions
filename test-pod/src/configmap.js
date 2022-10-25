const exec = require('@actions/exec');
const core = require('@actions/core');
const { getShortSha } = require('../../utils/src/branch-info');

const mapName = async () => {
  const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
  const sha = await getShortSha(process.env.GITHUB_SHA);
  return `${repo}-${sha}`;
};

const createConfigMap = async ({ namespace }, workingDirectory, entrypoint) => {
  const name = await mapName();

  const args = [
    'create',
    'configmap',
    name,
    '-n',
    namespace,
  ];

  const hasDir = workingDirectory !== '';
  const hasEntrypoint = entrypoint !== '';

  if (!hasDir && !hasEntrypoint) {
    core.info('No workingDirectory or entrypoint specified - skip ConfigMap.');
    return null;
  }

  if (hasDir) {
    args.push(`--from-file=${workingDirectory}`);
  }
  if (hasEntrypoint) {
    args.push(`--from-file=entrypoint.sh=${entrypoint}`);
  }

  return exec.exec('kubectl', args)
    .then(() => ({
      name,
      workingDirectory: hasDir,
      entrypoint: hasEntrypoint,
    }));
};

const deleteConfigMap = async ({ namespace }) => {
  const name = await mapName();
  return exec.exec(
    'kubectl',
    [
      'delete',
      'configmap',
      name,
      '-n',
      namespace,
    ],
  );
};

module.exports = {
  createConfigMap,
  deleteConfigMap,
};
