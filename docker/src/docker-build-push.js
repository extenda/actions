const core = require('@actions/core');
const docker = require('./docker');
const urlhelper = require('./url-helper');

const processBuildArgsInput = (buildArgsInput) => {
  let buildArgs = null;
  if (buildArgsInput) {
    buildArgs = buildArgsInput.split(',');
  }

  return buildArgs;
};

const run = () => {
  try {
    const image = core.getInput('image', { required: true });
    const registryInput = core.getInput('registry', { required: false });
    const tag = core.getInput('tag', { required: true });
    const buildArgs = processBuildArgsInput(core.getInput('buildArgs'));

    const registry = urlhelper.getRegistryUrl(registryInput);
    const imageName = `${registry}/${image}:${tag}`;

    docker.login(registry);
    docker.build(imageName, buildArgs);
    docker.push(imageName);

    core.setOutput('imageFullName', imageName);
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = run;
