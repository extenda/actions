import { isDeepStrictEqual } from 'node:util';

import * as core from '@actions/core';
import { getIdToken, setupGcloud } from 'setup-gcloud/src/index.js';

import { loadTranslations } from './load-translations.js';
import {
  getResolvedEntries,
  publishDefaultLayer,
  resolveBaseUrl,
} from './trs-api.js';

const AUDIENCE = 'trs.translation-api';
const DEFAULT_PATH = 'translations/';
const DEFAULT_ENVIRONMENT = 'prod';

async function action() {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const moduleId = core.getInput('module-id', { required: true });
  const environment = core.getInput('environment') || DEFAULT_ENVIRONMENT;
  const dir = core.getInput('path') || DEFAULT_PATH;
  const apiUrl = core.getInput('api-url');
  const dryRun = core.getInput('dry-run') === 'true';

  const baseUrl = resolveBaseUrl(environment, apiUrl);
  const { file, entries } = loadTranslations(dir);

  core.info(`Loaded ${Object.keys(entries).length} entries from ${file}`);

  // A publish stores a new file version and invalidates every client's cached ETag, so an
  // unchanged file is not republished. The service has no per-layer read, so this compares
  // against the resolved read, where a managed override can hide the default layer's own state.
  const resolved = await getResolvedEntries(baseUrl, moduleId);
  const unchanged = resolved !== null && isDeepStrictEqual(resolved, entries);

  if (dryRun) {
    core.info(dryRunReport(unchanged, moduleId, baseUrl));

    return;
  }
  if (unchanged) {
    core.info(
      `Translations for ${moduleId} are unchanged on ${baseUrl}. Skipping publish.`,
    );

    return;
  }

  await setupGcloud(serviceAccountKey);

  const token = await getIdToken(AUDIENCE);
  const { created } = await publishDefaultLayer(
    baseUrl,
    moduleId,
    entries,
    token,
  );

  core.info(
    `${created ? 'Created' : 'Replaced'} the default layer for ${moduleId} on ${baseUrl}.`,
  );
}

function dryRunReport(unchanged, moduleId, baseUrl) {
  return unchanged
    ? `Dry run: translations for ${moduleId} are unchanged on ${baseUrl}. A real run would skip the publish.`
    : `Dry run: would publish the default layer for ${moduleId} to ${baseUrl}.`;
}

export default action;
