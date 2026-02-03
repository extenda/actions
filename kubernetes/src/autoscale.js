import * as exec from '@actions/exec';
import fs from 'fs';

const getAutoscaleType = (autoscale) => {
  if (!autoscale) {
    return null;
  }

  if (autoscale.subscriptionName) {
    return 'PUBSUB';
  }

  return 'CPU';
};

const getAutoscale = async (deploymentName) => {
  // We introduce this variable to get the output of the kubectl command.
  let errOutput = '';
  // Trying to get autoscaler first. Only delete it if it exists.
  try {
    await exec.exec(
      'kubectl',
      ['get', 'hpa', deploymentName, `--namespace=${deploymentName}`],
      {
        listeners: {
          stderr: (data) => {
            errOutput += data.toString('utf8');
          },
        },
      },
    );
  } catch (err) {
    if (errOutput.includes('(NotFound)')) {
      return false;
    }
    throw err;
  }
  return true;
};

/**
 * Only removes autoscale configuration if it exists.
 * Manually scales the number of replicas to the provided value.
 */
const removeAutoscale = async (
  deploymentName,
  deploymentType,
  permanentReplicas,
  dryRunArg,
) => {
  // Check if the autoscale configuration exists for deployment.
  const autoscaleExists = await getAutoscale(deploymentName);
  // If it doesn't exist there's nothing to do.
  if (!autoscaleExists) {
    return;
  }
  // Delete existing autoscaler configuration.
  await exec.exec('kubectl', [
    'delete',
    'hpa',
    deploymentName,
    `--namespace=${deploymentName}`,
    ...dryRunArg,
  ]);
  // Manually scale replicas to the provided value.
  await exec.exec('kubectl', [
    'scale',
    deploymentType,
    deploymentName,
    `--namespace=${deploymentName}`,
    `--replicas=${permanentReplicas}`,
    ...dryRunArg,
  ]);
};

/**
 * Applies autoscale configuration to the existing deployment.
 * If autoscale configuration is not provided, autoscaling will be deleted from services' spec.
 * Provided deploymentType must be consistent with the one of the existing service.
 * @param  deploymentName service name
 * @param  deploymentType statefulSet or deployment
 * @param  autoscale configuration must include minReplicas, maxReplicas and (cpuPercent OR
 *  subscriptionName and targetAverageValue),
 * @param  permanentReplicas value to be used if autoscale configuration is deleted
 * @param  dryRun if true no actual changes will be applied to production
 */
const applyAutoscale = async (
  deploymentName,
  deploymentType,
  autoscale,
  permanentReplicas,
  dryRun,
) => {
  const dryRunArg = dryRun ? ['--dry-run=client'] : [];
  const autoscaleType = getAutoscaleType(autoscale);

  // If there's no autoscale parameters provided we remove autoscale configuration from deployment
  if (!autoscaleType) {
    await removeAutoscale(
      deploymentName,
      deploymentType,
      permanentReplicas,
      dryRunArg,
    );
    return;
  }

  if (autoscaleType === 'CPU') {
    // Horizontal pod CPU autoscaler spec template.
    const hpaYaml = `
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: ${deploymentName}
  namespace: ${deploymentName}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: ${deploymentType}
    name: ${deploymentName}
  minReplicas: ${autoscale.minReplicas}
  maxReplicas: ${autoscale.maxReplicas}
  targetCPUUtilizationPercentage: ${autoscale.cpuPercent}
`;

    // Write hpa template to disc to apply afterwards.
    fs.writeFileSync('hpa.yml', hpaYaml);
  }

  if (autoscaleType === 'PUBSUB') {
    // Horizontal pod PUBSUB autoscaler spec template.
    const hpaYaml = `
apiVersion: autoscaling/v2beta2
kind: HorizontalPodAutoscaler
metadata:
  name: ${deploymentName}
  namespace: ${deploymentName}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: ${deploymentType}
    name: ${deploymentName}
  minReplicas: ${autoscale.minReplicas}
  maxReplicas: ${autoscale.maxReplicas}
  metrics:
  - external:
      metric:
        name: pubsub.googleapis.com|subscription|num_undelivered_messages
        selector:
          matchLabels:
            resource.labels.subscription_id: ${autoscale.subscriptionName}
      target:
        type: AverageValue
        averageValue: ${autoscale.targetAverageUndeliveredMessages}
    type: External
`;

    // Write hpa template to disc to apply afterwards.
    fs.writeFileSync('hpa.yml', hpaYaml);
  }

  // Apply the autoscale configuration from above.
  await exec.exec('kubectl', ['apply', '-f', 'hpa.yml', ...dryRunArg]);
};

export default applyAutoscale;
