import core from '@actions/core';

import projectInfo from '../../cloud-run/src/project-info';
import { setupGcloud } from '../../setup-gcloud';
import { failIfNotTrunkBased, run } from '../../utils';
import buildManifest from './manifests/build-manifest';
import { imageTag as collectorVersion } from './manifests/collector-sidecar';
import deploy from './manifests/deploy';
import getImageWithSha256 from './manifests/image-sha256';
import { securityVersion } from './manifests/security-sidecar';
import publishPolicies from './policies/publish-policies';
import checkPolicyExists from './utils/cloud-armor';
import readSecret from './utils/load-credentials';
import {
  refreshCanaryStatus,
  sendDeployInfo,
  sendDeployRequest,
  sendScaleSetup,
} from './utils/send-request';
import loadServiceDefinition from './utils/service-definition';
import runScan from './utils/vulnerability-scanning';

const action = async () => {
  const serviceAccountKeyPipeline = core.getInput('secrets-account-key', {
    required: true,
  });
  const serviceAccountKeyCICD = core.getInput('service-account-key', {
    required: true,
  });
  const serviceFile =
    core.getInput('service-definition') || 'cloud-deploy.yaml';
  const userImage = core.getInput('image', { required: true });
  const updateDns = core.getInput('update-dns');

  // Only migrate DNS if explicitly set to always.
  const migrate = `${updateDns}`.trim().toLowerCase() === 'always';
  core.info(`update-dns set to '${updateDns}' results in migrate=${migrate}`);

  // const verbose = (core.getInput('verbose') || 'false');

  failIfNotTrunkBased();

  // Ensure our gcloud is available and installed.
  const projectID = await setupGcloud(serviceAccountKeyCICD, 'latest', true);

  const { project: clanName, env } = projectInfo(projectID);

  const http2Certificate = await readSecret(
    serviceAccountKeyPipeline,
    env,
    'envoy-http2-certs',
    'HTTPS_CERTIFICATES',
  );
  const internalHttpsCertificateKey = await readSecret(
    serviceAccountKeyPipeline,
    env,
    'internal-https-certs-key',
    'INTERNAL_HTTPS_CERTIFICATES_KEY',
  );
  const internalHttpsCertificateCrt = await readSecret(
    serviceAccountKeyPipeline,
    env,
    'internal-https-certs-crt',
    'INTERNAL_HTTPS_CERTIFICATES_CRT',
  );
  await readSecret(
    serviceAccountKeyPipeline,
    env,
    'sec-launchdarkly-sdk-key',
    'SEC_LAUNCHDARKLY_SDK_KEY',
  );

  const deployYaml = loadServiceDefinition(serviceFile);
  const {
    'cloud-run': cloudrun,
    kubernetes,
    environments,
    security,
    labels,
  } = deployYaml;

  const image = await getImageWithSha256(userImage);
  core.info(`Provided image ${userImage} resolved to ${image}`);

  const {
    timeout = 300,
    type = 'cloud-run',
    service: serviceName,
    protocol,
    'internal-traffic': internalTraffic = true,
    scaling,
    monitoring,
    traffic = {},
    'request-logs': { 'load-balancer': enableLoadBalancerLogs = false } = {},
  } = kubernetes || cloudrun;

  const { staging, production } = environments;

  const { consumers, 'cloud-armor': cloudArmor } =
    security === 'none' ? {} : security || {};

  const { 'service-accounts': IAMServiceAccounts = [] } = consumers || {};

  const { 'policy-name': cloudArmorPolicy = undefined } = cloudArmor || {};

  const {
    'static-egress-ip': staticEgress = true,
    'serve-traffic': serveTraffic = true,
  } = traffic;

  if (!cloudrun && consumers) {
    throw new Error('Consumers security configuration is only for cloud-run');
  }

  // fail early if cloud armor policy doesn't exist
  if (cloudArmorPolicy) {
    await checkPolicyExists(cloudArmorPolicy, projectID);
  }

  const {
    'domain-mappings': domainMappings,
    'path-mappings': pathMappings = [],
    'min-instances': minInstances,
  } = env === 'staging' ? staging : production;

  const domainMappingsClone = [].concat(domainMappings);
  const platformGKE = !cloudrun;

  // Trivvy scanning
  if (process.platform !== 'win32') {
    if (env !== 'staging' || projectID === 'quotes-staging-ccdf') {
      core.info('Run Trivy scanning');
      await runScan(serviceAccountKeyCICD, image, serviceName, labels);
    }
  }

  // setup manifests (hpa, deploy, negs)
  const version = new Date().getTime();

  core.info('Build manifests');
  await buildManifest(
    image,
    deployYaml,
    projectID,
    clanName,
    env,
    timeout,
    http2Certificate,
    internalHttpsCertificateCrt,
    internalHttpsCertificateKey,
    serviceAccountKeyCICD,
  );

  await publishPolicies(
    serviceName,
    env,
    userImage.split(':')[1] || version,
    deployYaml,
  );

  core.info('Run cloud-deploy');
  const succesfulDeploy = await deploy(
    projectID,
    serviceName,
    version,
    platformGKE,
    IAMServiceAccounts,
  );

  if (succesfulDeploy) {
    // Setup scaling scheduler
    if (scaling.schedule && env === 'prod' && minInstances > 0) {
      const requests = [];
      for (const schedule of scaling.schedule) {
        // check region match once region is implemented
        const [scaleUp, scaleDown] = schedule['scale-hours'].split('-');
        requests.push(
          sendScaleSetup(
            serviceName,
            projectID,
            'europe-west1',
            platformGKE ? 'kubernetes' : 'cloudrun',
            minInstances,
            scaleUp,
            scaleDown,
          ),
        );
      }
      await Promise.all(requests);
    }
    // Send deploy information when deployed to production
    if (env === 'prod') {
      const requests = [];
      const timestamp = new Date().toISOString();
      const githubRepository = `https://github.com/${process.env.GITHUB_REPOSITORY}`;
      const githubSHA = process.env.GITHUB_SHA;
      const slackChannel = await readSecret(
        serviceAccountKeyCICD,
        env,
        'clan_slack_channel',
        'CLAN_SLACK_CHANNEL',
      );

      requests.push(
        sendDeployInfo(
          serviceName,
          timestamp,
          version,
          projectID,
          githubRepository,
          githubSHA,
          slackChannel,
        ),
      );

      // make request to platform api to refresh canary status for service if serve-traffic is set to false
      if (!serveTraffic) {
        const serviceInfo = {
          service: serviceName,
          project: projectID,
        };
        requests.push(refreshCanaryStatus(serviceInfo));
      }

      await Promise.all(requests);
    }

    const deployData = {
      serviceName,
      projectID,
      platform: platformGKE ? 'kubernetes' : 'cloud-run',
      type,
      protocol,
      timeout,
      region: 'europe-west1',
      migrate,
      cloudArmorPolicy,
      internalTraffic,
      loggingSampleRate: enableLoadBalancerLogs ? 1 : 0,
      domainMappings: domainMappingsClone,
      pathMappings,
      staticEgress,
      securityVersion: security === 'none' ? 'none' : securityVersion(security),
      collectorVersion: monitoring ? collectorVersion(monitoring) : 'none',
    };

    Object.keys(deployData).forEach((key) =>
      deployData[key] === undefined ? delete deployData[key] : {},
    );
    if (pathMappings) {
      for (const pathMap of pathMappings) {
        if (pathMap.service) {
          pathMap.target = `service/${pathMap.service}`;
          delete pathMap.service;
        }
        if (pathMap.bucket) {
          pathMap.target = `bucket/${pathMap.bucket}`;
          delete pathMap.bucket;
        }
        if (pathMap['path-rewrite']) {
          pathMap.rewrite = pathMap['path-rewrite'];
          delete pathMap['path-rewrite'];
        }
      }
    }
    await sendDeployRequest(deployData);
  } else {
    throw new Error(
      'Deployment failed! Check container logs and status for error!',
    );
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
