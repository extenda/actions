import core from '@actions/core';

import { run } from '../../utils';
import { loadSecrets, parseInputYaml } from './secrets';

run(async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const secretsInput = core.getInput('secrets', { required: true });
  const secrets = parseInputYaml(secretsInput);

  await loadSecrets(serviceAccountKey, secrets);
});
