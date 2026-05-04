import * as core from '@actions/core';
import axios from 'axios';
import { getIdToken, setupGcloud } from 'setup-gcloud/src/index.js';

const PLATFORM_API_PROD = 'https://platform-api.retailsvc.com';
const AUDIENCE = 'platform';
const REGION = 'europe-west1';

// Same filter the platform API applies server-side
const PROJECT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*-[a-z0-9]{4}$/;

const extractConsumerProjectIDs = (allowedConsumers, producerProjectId) => {
  const ids = new Set();
  for (const group of allowedConsumers) {
    for (const sa of group['service-accounts'] ?? []) {
      const match = sa.match(/@([^.]+)\.iam\.gserviceaccount\.com$/);
      if (!match) continue;
      const id = match[1];
      if (id === producerProjectId) continue;          // same project
      if (!PROJECT_ID_PATTERN.test(id)) continue;     // non-standard ID (tf-admin etc.)
      ids.add(id);
    }
  }
  return ids;
};

// Build a Set of "serviceName::consumerProjectID" keys from a list of connections
// as returned by GET /internal-connections/producer/:projectID/:region
const buildCurrentKeys = (connections) => {
  const keys = new Set();
  for (const conn of connections) {
    for (const svc of conn.services ?? []) {
      keys.add(`${svc.service_name}::${conn.consumer_projectid}`);
    }
  }
  return keys;
};

const logDryRunDiff = async (client, projectId, mappedServices) => {
  core.info(`PSC sync dry-run for ${projectId} — fetching current state from platform API:`);

  const { data: currentConnections } = await client.get(
    `/internal-connections/producer/${projectId}/${REGION}`,
  );
  const currentKeys = buildCurrentKeys(currentConnections);

  const desiredKeys = new Set();
  for (const service of mappedServices) {
    for (const consumer of extractConsumerProjectIDs(service['allowed-consumers'], projectId)) {
      desiredKeys.add(`${service.name}::${consumer}`);
    }
  }

  const toAdd = [...desiredKeys].filter((k) => !currentKeys.has(k));
  const toRemove = [...currentKeys].filter((k) => !desiredKeys.has(k));

  if (toAdd.length === 0 && toRemove.length === 0) {
    core.info('  No PSC changes.');
  }
  for (const key of toAdd) {
    const [svc, consumer] = key.split('::');
    core.info(`  Would connect:    ${consumer} → ${svc}`);
  }
  for (const key of toRemove) {
    const [svc, consumer] = key.split('::');
    core.info(`  Would disconnect: ${consumer} → ${svc}`);
  }
};

const syncPscConnections = async (prodServiceAccountKey, iam, dryRun = false) => {
  const services = iam.services ?? [];
  if (services.length === 0) {
    return;
  }

  const mappedServices = services.map(({ name, 'allowed-consumers': allowedConsumers }) => ({
    name,
    'allowed-consumers': allowedConsumers ?? [],
  }));

  const projectId = await setupGcloud(prodServiceAccountKey);

  const token = await getIdToken(AUDIENCE);
  const client = axios.create({
    baseURL: PLATFORM_API_PROD,
    headers: { authorization: `Bearer ${token}` },
  });

  if (dryRun) {
    await logDryRunDiff(client, projectId, mappedServices);
    return;
  }

  const payload = {
    'project-id': projectId,
    services: mappedServices,
  };

  core.info(`Syncing PSC connections for ${projectId}`);

  const response = await client.post('/internal-connections/sync', payload);

  for (const result of response.data) {
    if (result.statusCode === 200 || result.statusCode === 409) {
      core.info(`  PSC ${result.action}: ${result.serviceName} → ${result.consumerProjectID}`);
    } else {
      core.warning(
        `  PSC ${result.action} failed: ${result.serviceName} → ${result.consumerProjectID}: ${result.message}`,
      );
    }
  }
};

export default syncPscConnections;
