const cp = require('child_process');
const core = require('@actions/core');
const fs = require('fs');

const createBuildCommand = (
  dockerfile,
  imageName,
  buildArgs,
  dockerContext,
  tags,
) => {
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

  const buildCmd = createBuildCommand(
    dockerfile,
    imageName,
    buildArgs,
    dockerContext,
    tags,
  );
  core.info(`Building Docker image (${imageName}): ${buildCmd}`);
  cp.execSync(buildCmd);
};

const isEcr = (registry) => registry && registry.includes('amazonaws');

const getRegion = (registry) =>
  registry.substring(
    registry.indexOf('ecr.') + 4,
    registry.indexOf('.amazonaws'),
  );

const login = (registry) => {
  if (!registry) {
    return;
  }

  core.info('Login started');

  let username;
  let password;

  // If using ECR, use the AWS CLI to obtain a JWT to use with docker-login
  if (isEcr(registry)) {
    const region = getRegion(registry);
    username = 'AWS';
    password = cp.execSync(`aws ecr get-login-password --region ${region}`);
  } else {
    username = core.getInput('username');
    password = core.getInput('password');
  }

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

  tags.forEach((tag) => {
    core.info(`Pushing Docker image ${imageName}:${tag}`);
    cp.execSync(`docker push ${imageName}:${tag}`);
  });
};

module.exports = {
  build,
  login,
  push,
};
