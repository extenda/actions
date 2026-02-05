import * as core from '@actions/core';

import * as docker from './docker.js';
import * as urlhelper from './url-helper.js';

const processBuildArgsInput = (buildArgsInput) => {
  let buildArgs = null;
  if (buildArgsInput) {
    buildArgs = buildArgsInput.split(',');
  }

  return buildArgs;
};

const processTags = (tagsInput) => {
  let tags = null;
  if (tagsInput) {
    tags = tagsInput.split(',');
  }

  return tags;
};

const action = () => {
  try {
    const image = core.getInput('image', { required: true });
    const registryInput = core.getInput('registry', { required: false });
    const tagInput = core.getInput('tag', { required: true });
    const tags = processTags(tagInput);
    const shouldPush = core.getInput('push', { required: false });
    const buildArgs = processBuildArgsInput(core.getInput('buildArgs'));

    const registry = urlhelper.getRegistryUrl(registryInput);
    docker.login(registry);

    const imageName = `${registry}/${image}`; // :${tag}
    docker.build(imageName, buildArgs, tags);

    if (shouldPush === 'true') {
      docker.push(imageName, tags);
    }

    core.setOutput('imageFullName', imageName);
  } catch (error) {
    core.setFailed(error.message);
  }
};

export default action;
