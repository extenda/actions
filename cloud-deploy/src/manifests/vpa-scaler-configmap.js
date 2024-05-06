const execGcloud = require("../utils/gcloud-output");

const convertCPU = (cpu) => cpu*1000 + 'm';
const convertMemory = (memory) => {
  if (memory.endsWith('Gi')){
    return (parseInt(memory)*1000) + 'Mi';
  }
  return memory;
}
const configMapManifest = async (namespace, type, CPU, Memory, scaling) => {
  const {
    'increments-cpu': incrementsCPU,
    'threshold-cpu': threshold,
    'max-cpu': maxCPU,
    'max-memory': maxMemory,
  } = scaling;
  const args = [
    'create',
    'configmap',
    'vpa-scaler-configuration',
    `--namespace=${namespace}`,
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
}

module.exports = configMapManifest;
const run = async () => console.log(await configMapManifest('platform-vpa-scaler', 'deployment', '0.25', '512Mi', {'increments-cpu': '1.5', 'threshold-cpu': '50', 'max-cpu': '4', 'max-memory': '5000Mi'}));
run();