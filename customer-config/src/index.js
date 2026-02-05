import * as core from '@actions/core';
import camelcaseKeys from 'camelcase-keys';

import { createApi } from '../../external-events/src/utils/create-api.js';
import { loadDefinitions } from '../../external-events/src/utils/load-sync-definitions.js';
import { loadSecrets } from './secrets-manager/load-secrets.js';
import { validateCccConfig } from './validate/validate-ccc-config.js';

function printSyncResult(report) {
  for (const { id, success, performedAction, error } of report) {
    if (success) {
      core.info(`[${id}]: ${performedAction}`);
    } else {
      core.error(`[${id}]: ${error}`);
    }
  }
}

async function action() {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const dryRun = core.getBooleanInput('dry-run') === true;
  const definitionsGlob =
    core.getInput('definitions') || 'customer-config/*.yaml';

  const definitions = await loadDefinitions(definitionsGlob, validateCccConfig);
  const secrets = await loadSecrets(serviceAccountKey);
  const cccApi = createApi({
    name: 'customer-config',
    auth: secrets,
    url: 'https://ccc-api.retailsvc.com',
  });

  let failed = false;
  for (const [file, def] of Object.entries(definitions)) {
    core.startGroup(`Sync definitions from ${file}`);
    // ignore version for now, as we have ony one version
    delete def.version;

    const { data } = await cccApi.post(
      `/api/v1/internal/configurations:sync?dryRun=${dryRun}`,
      camelcaseKeys(def, { deep: true }),
    );

    printSyncResult(data.report);

    if (!data.success) {
      failed = true;
      core.error('Sync process had some errors (see details above).');
    }
    core.endGroup();
  }
  if (failed) {
    throw new Error('Sync process had some errors (see details above).');
  }
}

export default action;
