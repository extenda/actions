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
  const serviceAccountKey = core.getInput('service-account-key');
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

  const token = await publishToken(serviceAccountKey, baseUrl);
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

/*
 * With a service account key, a Google ID token for the allow-listed pipeline account. Without
 * one, the workflow's own GitHub OIDC token: the service verifies it against GitHub and lets the
 * repository publish the modules it owns, with no service account and no secret. Its audience is
 * the service's own origin, which is how a staging token is kept off production.
 */
async function publishToken(serviceAccountKey, baseUrl) {
  if (serviceAccountKey) {
    await setupGcloud(serviceAccountKey);

    return getIdToken(AUDIENCE);
  }

  try {
    return await core.getIDToken(new URL(baseUrl).origin);
  } catch (error) {
    throw new Error(
      `Could not get a GitHub OIDC token (${error.message}). Either give the job 'permissions: id-token: write' or pass a service-account-key.`,
      { cause: error },
    );
  }
}

function dryRunReport(unchanged, moduleId, baseUrl) {
  return unchanged
    ? `Dry run: translations for ${moduleId} are unchanged on ${baseUrl}. A real run would skip the publish.`
    : `Dry run: would publish the default layer for ${moduleId} to ${baseUrl}.`;
}

export default action;
