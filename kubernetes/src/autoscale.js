const exec = require('@actions/exec');
const fs = require('fs');

const removeAutoscale = async (deploymentName, deploymentType, permanentReplicas, dryRunArg) => {
  let errOutput = '';
  try {
    await exec.exec('kubectl', ['get', 'hpa', deploymentName],
      {
        listeners: {
          stderr: (data) => {
            errOutput += data.toString('utf8');
          },
        },
      });
  } catch (err) {
    if (errOutput.includes('(NotFound)')) {
      return;
    }
    throw err;
  }

  await exec.exec('kubectl', ['delete', 'hpa', deploymentName, ...dryRunArg]);
  await exec.exec('kubectl', ['scale', deploymentType, deploymentName, `--replicas=${permanentReplicas}`, ...dryRunArg]);
}


const applyAutoscale = async (deploymentName, deploymentType, autoscale, permanentReplicas, 
  dryRun) => {
  const dryRunArg = dryRun ? ['--dry-run=client'] : [];

  if (autoscale == null) {
    await removeAutoscale(deploymentName, deploymentType, permanentReplicas, dryRunArg);
    return;
  }

  const hpaYaml = `
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: ${deploymentName}
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

  fs.writeFileSync('hpa.yml', hpaYaml);

  await exec.exec('kubectl', ['apply', '-f', 'hpa.yml', ...dryRunArg]);
};

module.exports = applyAutoscale;