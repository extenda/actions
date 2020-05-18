const exec = require('@actions/exec');
const { getShortSha } = require('../../utils/src/branch-info');

const podName = async () => {
  const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
  const sha = await getShortSha(process.env.GITHUB_SHA);
  return `${repo}-${sha}-test`;
};

const createOverride = (name, namespace, image, configMap) => {
  const container = {
    name,
    image,
    workingDir: '/work',
    volumeMounts: [{
      mountPath: '/work',
      name: 'workspace',
      readOnly: false,
    }],
  };

  if (configMap.entrypoint) {
    container.command = ['/bin/sh', 'entrypoint.sh'];
  }

  return {
    apiVersion: 'v1',
    metadata: {
      namespace,
    },
    spec: {
      containers: [
        container,
      ],
      volumes: [{
        name: 'workspace',
        configMap: {
          name: configMap.name,
        },
      }],
    },
  };
};

const runPod = async ({ namespace }, image, configMap) => {
  const name = await podName();

  const args = [
    'run',
    name,
    '--rm',
    '--attach',
    '--restart=Never',
    `--image=${image}`,
    '-n',
    namespace,
  ];

  if (configMap) {
    const json = JSON.stringify(createOverride(name, namespace, image, configMap));
    args.push(`--override=${json}`);
  }

  return exec.exec('kubectl', args);
};

module.exports = runPod;
