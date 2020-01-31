const cp = require('child_process');
const core = require('@actions/core');
const fs = require('fs');
const maxBufferSize = require('../src/settings');

const createBuildCommand = (dockerfile, imageName, buildArgs) => {
  let buildCommandPrefix = `docker build -f ${dockerfile} -t ${imageName}`;
  if (buildArgs) {
    const argsSuffix = buildArgs.map((arg) => `--build-arg ${arg}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
  }

  return `${buildCommandPrefix} .`;
};

const build = (imageName, buildArgs) => {
  const dockerfile = core.getInput('dockerfile');

  if (!fs.existsSync(dockerfile)) {
    core.setFailed(`Dockerfile does not exist in location ${dockerfile}`);
  }

  core.info(`Building Docker image: ${imageName}`);
  cp.execSync(createBuildCommand(dockerfile, imageName, buildArgs));
  // , { maxBuffer: maxBufferSize }
};

const isEcr = (registry) => registry && registry.includes('amazonaws');

const getRegion = (registry) => registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));

const login = () => {
  const registry = core.getInput('registry', { required: true });
  const username = core.getInput('username');
  const password = core.getInput('password');

  // If using ECR, use the AWS CLI login command in favor of docker login
  if (isEcr(registry)) {
    const region = getRegion(registry);
    core.info(`Logging into ECR region ${region}...`);
    cp.execSync(`$(aws ecr get-login --region ${region} --no-include-email)`);
  } else if (username && password) {
    core.info(`Logging into Docker registry ${registry}...`);
    cp.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
      input: password,
    });
  }
};

const push = (imageName) => {
  core.info(`Pushing Docker image ${imageName}`);
  cp.execSync(`docker push ${imageName}`);
};

module.exports = {
  build,
  login,
  push,
};
