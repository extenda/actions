import * as core from '@actions/core';
import camelcaseKeys from 'camelcase-keys';

import { loadSecrets } from './secrets-manager/load-secrets.js';
import { createApi } from './utils/create-api.js';
import { loadDefinitions } from './utils/load-sync-definitions.js';
import { validateExeConfig } from './validate/validate-exe-config.js';

function printSyncResult(report) {
  for (const { id, success, performedAction, error } of report) {
    if (success) {
      performedAction
        ? core.info(`[${id}]: ${performedAction}`)
        : core.info(`[${id}]: no changes`);
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
    core.getInput('definitions') || 'external-events/*.yaml';

  const definitions = await loadDefinitions(definitionsGlob, validateExeConfig);
  const secrets = await loadSecrets(serviceAccountKey);
  const exeApi = createApi({
    name: 'external-events',
    auth: secrets,
    url: 'https://exe-management.retailsvc.com',
  });

  let failed = false;
  for (const [file, def] of Object.entries(definitions)) {
    core.startGroup(`Sync definitions from ${file}`);
    // ignore version for now, as we have ony one version
    delete def.version;

    const { data } = await exeApi.post(
      `/api/v1/internal/event-sources:sync?dryRun=${dryRun}`,
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

// Entry point check removed for ESM compatibility

export default action;
