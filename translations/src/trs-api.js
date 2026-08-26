import * as core from '@actions/core';
import axios from 'axios';

import { LANG_TAG } from './constants.js';

const HOSTS = {
  staging: 'https://translation.retailsvc.dev',
  prod: 'https://translation.retailsvc.com',
};

const OK = 200;
const CREATED = 201;
const NOT_FOUND = 404;
const UNPROCESSABLE_ENTITY = 422;

// Every status is handled here, so none of them may reject the request.
const ANY_STATUS = { validateStatus: () => true };

export function resolveBaseUrl(environment, apiUrl) {
  if (apiUrl) {
    return apiUrl.replace(/\/+$/, '');
  }

  const baseUrl = HOSTS[environment];
  if (!baseUrl) {
    throw new Error(
      `Invalid environment '${environment}'. Expected one of: ${Object.keys(HOSTS).join(', ')}`,
    );
  }

  return baseUrl;
}

export async function getResolvedEntries(baseUrl, moduleId) {
  const response = await axios.get(
    translationsUrl(baseUrl, moduleId),
    ANY_STATUS,
  );

  if (response.status === OK) {
    return response.data.entries ?? {};
  }
  if (response.status === NOT_FOUND) {
    return null;
  }

  // The read only feeds the unchanged check, so an unknown current state means publish.
  core.warning(
    `Could not read the current translations: ${describe(response)}. Publishing anyway.`,
  );

  return null;
}

export async function publishDefaultLayer(baseUrl, moduleId, entries, token) {
  const response = await axios.put(
    `${translationsUrl(baseUrl, moduleId)}/layers/default`,
    { entries },
    { ...ANY_STATUS, headers: { authorization: `Bearer ${token}` } },
  );

  if (response.status === OK || response.status === CREATED) {
    return { created: response.status === CREATED };
  }
  if (response.status === UNPROCESSABLE_ENTITY) {
    throw validationError(response);
  }

  throw new Error(`Translation Service publish failed: ${describe(response)}`);
}

function validationError({ data }) {
  const messages = [].concat(data?.message ?? []);
  messages.forEach((message) => core.error(message));

  return new Error(
    `Translation validation failed with ${messages.length} error(s):\n${messages.join('\n')}`,
  );
}

function translationsUrl(baseUrl, moduleId) {
  return `${baseUrl}/api/v1/modules/${encodeURIComponent(moduleId)}/translations/${LANG_TAG}`;
}

function describe({ status, data }) {
  return `[${status}] - ${JSON.stringify(data)}`;
}
