import * as core from '@actions/core';

import { loadSecrets, parseInputYaml } from './secrets.js';

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const secretsInput = core.getInput('secrets', { required: true });
  const secrets = parseInputYaml(secretsInput);

  await loadSecrets(serviceAccountKey, secrets);
};

export default action;
