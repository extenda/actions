const cp = require('child_process');
const core = require('@actions/core');
const fs = require('fs');

const createBuildCommand = (dockerfile, imageName, buildArgs, dockerContext, tags) => {
  let buildCommandPrefix = `docker build -f ${dockerfile}`;

  if (tags) {
    const tagsSuffix = tags.map((tag) => `-t ${imageName}:${tag}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${tagsSuffix}`;
  } else {
    buildCommandPrefix = `${buildCommandPrefix} -t ${imageName}`;
  }

  if (buildArgs) {
    const argsSuffix = buildArgs.map((arg) => `--build-arg ${arg}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
  }

  return `${buildCommandPrefix} ${dockerContext}`;
};

const build = (imageName, buildArgs, tags) => {
  const dockerfile = core.getInput('dockerfile');
  const dockerContext = core.getInput('docker-context', { required: false });

  if (!fs.existsSync(dockerfile)) {
    core.setFailed(`Dockerfile does not exist in location ${dockerfile}`);
  }

  core.info(`Building Docker image: ${imageName}`);
  cp.execSync(createBuildCommand(dockerfile, imageName, buildArgs, dockerContext, tags));
};

const isEcr = (registry) => registry && registry.includes('amazonaws');

const getRegion = (registry) => registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));

const login = (registry) => {
  if (!registry) {
    return;
  }

  core.info('Login started');
  // If using ECR, use the AWS CLI login command in favor of docker login
  if (isEcr(registry)) {
    const region = getRegion(registry);
    core.info(`Logging into ECR region ${region}...`);
    cp.execSync(`$(aws ecr get-login --region ${region} --no-include-email)`);
    return;
  }

  const username = core.getInput('username');
  const password = core.getInput('password');

  core.info(`Logging into Docker registry ${registry}...`);
  cp.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
    input: password,
  });
};

const push = (imageName, tags) => {
  if (!tags) {
    core.info(`Pushing Docker image ${imageName} without tags`);
    cp.execSync(`docker push ${imageName}`);
    return;
  }

  tags.array.forEach((tag) => {
    core.info(`Pushing Docker image ${imageName}:${tag}`);
    cp.execSync(`docker push ${imageName}:${tag}`);
  });
};

module.exports = {
  build,
  login,
  push,
};
