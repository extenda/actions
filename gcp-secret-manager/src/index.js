import * as core from '@actions/core';

import { run } from '../../utils/src/index.js';
import { loadSecrets, parseInputYaml } from './secrets.js';

run(async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const secretsInput = core.getInput('secrets', { required: true });
  const secrets = parseInputYaml(secretsInput);

  await loadSecrets(serviceAccountKey, secrets);
});
