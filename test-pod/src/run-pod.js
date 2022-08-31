const core = require('@actions/core');
const exec = require('@actions/exec');
const { getShortSha } = require('../../utils/src/branch-info');
const { extractOutput, LogFilter } = require('./extract-output');
const { getImageDigest } = require('../../utils/src');

const podName = async () => {
  const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
  const sha = await getShortSha(process.env.GITHUB_SHA);
  return `${repo}-${sha}-test`;
};

const TEST_POD_ENV_PREFIX = 'TESTPOD_';
const PREFIX_LEN = TEST_POD_ENV_PREFIX.length;

const podEnv = (trimPrefix) => Object
  .entries(process.env)
  .filter(([envName]) => envName.startsWith(TEST_POD_ENV_PREFIX))
  .map(([envName, envValue]) => [trimPrefix ? envName.slice(PREFIX_LEN) : envName, envValue]);

const createOverride = (pod, namespace, image, configMap, serviceUrl, trimPrefix) => {
  const container = {
    name: pod,
    image,
  };

  if (configMap) {
    container.workingDir = '/work';
    container.volumeMounts = [{
      mountPath: '/work',
      name: 'workspace',
      readOnly: false,
    }];
  }

  if (serviceUrl) {
    container.env = [{
      name: 'SERVICE_URL',
      value: serviceUrl,
    }];
  }

  podEnv(trimPrefix).forEach(([envName, envValue]) => {
    if (!container.env) {
      container.env = [];
    }
    container.env.push({
      name: envName,
      value: envValue,
    });
  });

  if (configMap && configMap.entrypoint) {
    container.command = ['/bin/sh', 'entrypoint.sh'];
  }

  const override = {
    apiVersion: 'v1',
    metadata: {
      namespace,
      labels: {
        'opa-injection': 'false',
      },
      annotations: {
        'sidecar.istio.io/inject': 'false',
      },
    },
    spec: {
      containers: [
        container,
      ],
    },
  };

  if (configMap) {
    override.spec.volumes = [{
      name: 'workspace',
      configMap: {
        name: configMap.name,
      },
    }];
  }

  return override;
};

const runPod = async ({ name, namespace }, image, configMap, trimPrefix) => {
  const pod = await podName();

  const imageDigest = await getImageDigest(image);
  const args = [
    'run',
    pod,
    '--rm',
    '--attach',
    '--restart=Never',
    '--pod-running-timeout=15m',
    `--image=${imageDigest}`,
    '-n',
    namespace,
  ];

  const serviceUrl = name ? `http://${name}.${namespace}` : null;

  if (serviceUrl) {
    args.push(`--env=SERVICE_URL=${serviceUrl}`);
  }

  podEnv(trimPrefix).forEach(([envName, envValue]) => {
    args.push(`--env=${envName}=${envValue}`);
  });

  const json = JSON.stringify(
    createOverride(pod, namespace, imageDigest, configMap, serviceUrl, trimPrefix),
  );
  args.push(`--overrides='${json}'`);

  let output = '';
  const filter = new LogFilter();
  core.info(`kubectl ${args.join(' ')}`);
  return exec.exec('kubectl', args, {
    silent: true,
    listeners: {
      stdout: (data) => {
        filter.log(data, process.stdout);
        output += data.toString('utf8');
      },
      stderr: (data) => {
        process.stderr.write(data);
      },
    },
  }).then((result) => extractOutput(output).then((dest) => {
    if (dest) {
      core.info(`Output saved to: ${dest}`);
    }
    return result;
  }));
};

module.exports = runPod;
