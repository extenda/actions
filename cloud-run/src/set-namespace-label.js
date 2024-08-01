const exec = require('@actions/exec');

const setLabel = async (namespace, label, value) =>
  exec.exec('kubectl', [
    'label',
    'namespace',
    namespace,
    `${label}=${value}`,
    '--overwrite=true',
  ]);

const setOpaInjectionLabels = async (namespace, opaEnabled) => {
  const opaInjection = opaEnabled ? 'enabled' : 'disabled';
  await setLabel(namespace, 'opa-istio-injection', opaInjection);
  await setLabel(namespace, 'istio-injection', opaInjection);
};

module.exports = {
  setLabel,
  setOpaInjectionLabels,
};
