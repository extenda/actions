const core = require('@actions/core');
const exec = require('@actions/exec');
const { setupGcloud } = require('../../setup-gcloud');
const getRuntimeAccount = require('./runtime-account');
const createEnvironmentArgs = require('./environment-args');
const { getClusterInfo } = require('./cluster-info');
const createNamespace = require('./create-namespace');
const projectInfo = require('./project-info');
const waitForRevision = require('./wait-revision');
const authenticateKubeCtl = require('./kubectl-auth');
const cleanRevisions = require('./clean-revisions');
const checkServiceAccount = require('./check-sa');
const runScan = require('./vulnerability-scanning');

const numericOrDefault = (value) => (value >= 0 ? value : 'default');

const isManagedCloudRun = (cpu) => {
  if (typeof cpu === 'string' && cpu.endsWith('m')) {
    return false;
  }
  return true;
};

const setDefaultConcurrency = (cpu) => {
  const cloudDefaultConcurrency = 80;
  const cloudDefaultCPU = 1000;
  const maxConcurrency = 100;
  const minConcurrency = 10;
  let miliCPU = 0;
  if (isManagedCloudRun(cpu)) {
    miliCPU = cpu * 1000;
  } else {
    miliCPU = cpu.replace(/\D/g, '');
  }
  let defaultConcurrency =
    cloudDefaultConcurrency * (miliCPU / cloudDefaultCPU);
  if (defaultConcurrency > maxConcurrency) {
    defaultConcurrency = maxConcurrency;
  } else if (defaultConcurrency < minConcurrency) {
    defaultConcurrency = minConcurrency;
  }
  return Math.ceil(defaultConcurrency);
};

const managedArguments = async (args, service, projectId) => {
  const {
    cpu,
    platform: {
      managed: {
        'allow-unauthenticated': allowUnauthenticated,
        'cloudsql-instances': cloudSqlInstances = undefined,
        region,
        'service-account': runtimeAccountEmail = 'cloudrun-runtime',
        'vpc-connector': vpcConnectorName = 'None',
        'vpc-egress': vpcEgress = 'private-ranges-only',
      },
    },
  } = service;

  const { env } = projectInfo(projectId);

  if (!isManagedCloudRun(cpu)) {
    throw new Error(
      'Managed Cloud Run must be configured with CPU count [1,2]. Use of millicpu is not supported.',
    );
  }

  const runtimeAccount = await getRuntimeAccount(
    runtimeAccountEmail,
    projectId,
  );
  args.push(`--service-account=${runtimeAccount}`);

  args.push(`--cpu=${cpu}`, '--platform=managed', `--region=${region}`);

  if (vpcConnectorName !== 'None' && env === 'prod') {
    args.push(`--vpc-connector=${vpcConnectorName}`);
  }

  if (vpcConnectorName !== 'None' && env === 'prod') {
    args.push(`--vpc-egress=${vpcEgress}`);
  }

  if (Array.isArray(cloudSqlInstances)) {
    if (cloudSqlInstances.length === 0) {
      args.push('--clear-cloudsql-instances');
    } else {
      args.push(`--set-cloudsql-instances=${cloudSqlInstances.join(',')}`);
    }
  }

  if (allowUnauthenticated) {
    args.push('--allow-unauthenticated');
  } else {
    args.push('--no-allow-unauthenticated');
  }
};

const gkeArguments = async (args, service, projectId) => {
  const {
    name,
    cpu,
    'min-instances': minInstances = -1,
    'enable-http2': enableHttp2 = false,
    platform: {
      gke: {
        cluster: configuredCluster = undefined,
        connectivity,
        namespace = name,
      },
    },
  } = service;

  if (isManagedCloudRun(cpu)) {
    throw new Error(
      'Cloud Run GKE must be configured with millicpu. Use of CPU count is not supported.',
    );
  }

  const cluster = await getClusterInfo(projectId, configuredCluster);

  args.push(
    `--cpu=${cpu}`,
    `--min-instances=${numericOrDefault(minInstances)}`,
    '--platform=gke',
    `--cluster=${cluster.uri}`,
    `--cluster-location=${cluster.clusterLocation}`,
    `--connectivity=${connectivity}`,
  );

  if (enableHttp2) {
    args.push('--use-http2');
  } else {
    args.push('--no-use-http2');
  }

  if (namespace !== 'default') {
    const opaEnabled = 'skip';
    await authenticateKubeCtl(cluster);
    await createNamespace(projectId, opaEnabled, namespace);
  }
  args.push(`--namespace=${namespace}`);

  return cluster;
};

const canaryArguments = async (
  args,
  canary,
  projectId,
  project,
  env,
  customLabels,
) => {
  const { enabled, steps, interval, thresholds } = canary;
  const {
    latency99,
    latency95,
    latency50,
    'error-rate': errorRates,
  } = thresholds;

  args.push(
    `--labels=${customLabels}service_project_id=${projectId},service_project=${project},environment=${env},service_env=${env},sre.canary.enabled=${enabled},sre.canary.steps=${steps},sre.canary.interval=${interval},sre.canary.thresholds.latency99=${latency99},sre.canary.thresholds.latency95=${latency95},sre.canary.thresholds.latency50=${latency50},sre.canary.thresholds.error=${errorRates}`,
    '--no-traffic',
  );
};

const execWithOutput = async (args) => {
  let stdout = '';
  let stderr = '';
  const status = await exec
    .exec('gcloud', args, {
      listeners: {
        stdout: (data) => {
          stdout += data.toString('utf8');
        },
        stderr: (data) => {
          stderr += data.toString('utf8');
        },
      },
    })
    .catch((err) => {
      core.error(`gcloud execution failed: ${err.message}`);
      stdout += stderr;
    });

  return {
    status,
    output: stdout ? stdout.trim() : '',
  };
};

const runDeploy = async (
  serviceAccountKey,
  service,
  image,
  verbose = false,
  retryInterval = 5000,
) => {
  // Authenticate gcloud with our service-account
  const projectId = await setupGcloud(serviceAccountKey);

  if (process.platform !== 'win32') {
    if (process.env.ENABLE_TRIVY === 'true') {
      await runScan(serviceAccountKey, image);
    }
  }

  const { project, env } = projectInfo(projectId);

  let canary = false;
  if (service.canary && service.canary.enabled && env === 'prod') {
    canary = true;
  }

  const {
    name,
    memory,
    concurrency = setDefaultConcurrency(service.cpu),
    'max-instances': maxInstances = -1,
    'max-revisions': maxRevisions = 4,
    environment = [],
  } = service;

  // Note the comma at the end of custom labels
  let customLabels = '';
  let labelKey = '';
  if (service.labels !== undefined) {
    const { labels } = service;
    for (labelKey in labels) {
      if (Object.prototype.hasOwnProperty.call(labels, labelKey)) {
        customLabels = `${customLabels}${labelKey}=${labels[labelKey]},`;
      }
    }
  }

  if (!isManagedCloudRun(service.cpu)) {
    await checkServiceAccount(name, projectId);
  }

  const args = [
    'run',
    'deploy',
    name,
    `--image=${image}`,
    `--project=${projectId}`,
    `--memory=${memory}`,
    `--concurrency=${concurrency}`,
    `--max-instances=${numericOrDefault(maxInstances)}`,
    `--set-env-vars=${createEnvironmentArgs(environment, projectId, image)}`,
  ];

  if (!canary) {
    args.push(
      `--labels=${customLabels}service_project_id=${projectId},service_project=${project},environment=${env},service_env=${env}${service.platform.managed ? '' : ',sre.canary.enabled=false'}`,
    );
  }

  if (verbose) {
    args.push('--verbosity=debug');
  }

  let cluster;
  if (service.platform.managed) {
    await managedArguments(args, service, projectId);
  }

  if (service.platform.gke) {
    cluster = await gkeArguments(args, service, projectId);
    if (canary) {
      await canaryArguments(
        args,
        service.canary,
        projectId,
        project,
        env,
        customLabels,
      );
    }
  }

  try {
    const gcloudExitCode = await execWithOutput(args).then((response) =>
      waitForRevision(
        response,
        args,
        service.name,
        cluster,
        service.canary,
        retryInterval,
      ),
    );
    return {
      gcloudExitCode,
      projectId,
      cluster,
    };
  } finally {
    if (service.platform.gke && cluster) {
      await cleanRevisions(
        name,
        projectId,
        cluster.uri,
        cluster.clusterLocation,
        maxRevisions,
      );
    }
  }
};

module.exports = runDeploy;
