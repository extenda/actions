const execGcloud = require('../utils/gcloud-output');

const convertCPU = (cpu) => `${cpu * 1000}m`;
const convertMemory = (memory) => {
  if (memory.includes('Gi')) {
    return `${parseFloat(memory, 10) * 1000}Mi`;
  }
  return memory;
};
const removeScalerConfiguration = async (service) =>
  execGcloud(
    [
      'delete',
      'configmap',
      'vpa-scaler-configuration',
      `--namespace=${service}`,
    ],
    'kubectl',
    true,
    true,
  ).catch(() => true); // consider configmap deleted or doesn't exist

const configMapManifest = async (service, type, CPU, Memory, scaling) => {
  const {
    'increments-cpu': incrementsCPU,
    threshold,
    'max-cpu': maxCPU,
    'max-memory': maxMemory,
  } = scaling;
  const args = [
    'create',
    'configmap',
    'vpa-scaler-configuration',
    `--namespace=${service}`,
    `--from-literal=type=${type}`,
    `--from-literal=incrementsCPU=${convertCPU(incrementsCPU)}`,
    `--from-literal=thresholdCPU=${threshold}%`,
    `--from-literal=currentCPU=${convertCPU(CPU)}`,
    `--from-literal=currentMemory=${convertMemory(Memory)}`,
    `--from-literal=maxCPU=${convertCPU(maxCPU)}`,
    `--from-literal=minCPU=${convertCPU(CPU)}`,
    `--from-literal=maxMemory=${convertMemory(maxMemory)}`,
    `--from-literal=minMemory=${convertMemory(Memory)}`,
    '--output=yaml',
    '--dry-run=client',
  ];
  return execGcloud(args, 'kubectl', true);
};

module.exports = {
  configMapManifest,
  removeScalerConfiguration,
};
