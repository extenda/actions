const exec = require('@actions/exec');
const fs = require('fs');

const getAutoscale = async (deploymentName) => {
  // We introduce this variable to get the output of the kubectl command.
  let errOutput = '';
  // Trying to get autoscaler first. Only delete it if it exists.
  try {
    await exec.exec('kubectl', ['get', 'hpa', deploymentName, `--namespace=${deploymentName}`],
      {
        listeners: {
          stderr: (data) => {
            errOutput += data.toString('utf8');
          },
        },
      });
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
const removeAutoscale = async (deploymentName, deploymentType, permanentReplicas, dryRunArg) => {
  // Check if the autoscale configuration exists for deployment.
  const autoscaleExists = await getAutoscale(deploymentName);
  // If it doesn't exist there's nothing to do.
  if (!autoscaleExists) {
    return;
  }
  // Delete existing autoscaler configuration.
  await exec.exec('kubectl', ['delete', 'hpa', deploymentName, `--namespace=${deploymentName}`, ...dryRunArg]);
  // Manually scale replicas to the provided value.
  await exec.exec('kubectl', ['scale', deploymentType, deploymentName, `--namespace=${deploymentName}`, `--replicas=${permanentReplicas}`, ...dryRunArg]);
};

/**
 * Applies autoscale configuration to the existing deployment.
 * If autoscale configuration is not provided, autoscaling will be deleted from services' spec.
 * Provided deploymentType must be consistent with the one of the existing service.
 * @param  deploymentName service name
 * @param  deploymentType statefulSet or deployment
 * @param  autoscale configuration must include minReplicas, maxReplicas and cpuPercent
 * @param  permanentReplicas value to be used if autoscale configuration is deleted
 * @param  dryRun if true no actual changes will be applied to production
 */
const applyAutoscale = async (deploymentName, deploymentType, autoscale, permanentReplicas,
  dryRun) => {
  const dryRunArg = dryRun ? ['--dry-run=client'] : [];

  // If there's no autoscale parameters provided we remove autoscale configuration from deployment
  if (autoscale == null) {
    await removeAutoscale(deploymentName, deploymentType, permanentReplicas, dryRunArg);
    return;
  }

  // Horizontal pod autoscaler spec template.
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
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: ${autoscale.cpuPercent}
`;

  // Write hpa template to disc to apply afterwards.
  fs.writeFileSync('hpa.yml', hpaYaml);

  // Apply the autoscale configuration from above.
  await exec.exec('kubectl', ['apply', '-f', 'hpa.yml', ...dryRunArg]);
};

module.exports = applyAutoscale;
