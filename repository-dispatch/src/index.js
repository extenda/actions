import { fileURLToPath } from 'node:url';

import * as core from '@actions/core';
import * as github from '@actions/github';

import { loadSecret } from '../../gcp-secret-manager/src/secrets.js';
import { loadGitHubToken, run } from '../../utils/src/index.js';

const createPayload = (payloadString) => {
  if (payloadString) {
    const payload = JSON.parse(payloadString);
    if (Object.keys(payload).length > 10) {
      throw new Error('client-payload can at most contain 10 top-level keys');
    }
    return payload;
  }

  return {
    github: github.context.payload,
  };
};

const action = async () => {
  const repository = core.getInput('repository', { required: true });
  const eventType = core.getInput('event-type', { required: true });
  const payloadString = core.getInput('client-payload') || '';
  const token = await loadGitHubToken(loadSecret);
  const clientPayload = createPayload(payloadString);
  const [owner, repo] = repository.split('/');

  const octokit = github.getOctokit(token);
  return octokit.rest.repos
    .createDispatchEvent({
      owner,
      repo,
      event_type: eventType,
      client_payload: clientPayload,
    })
    .then(() => {
      core.info(`Dispatched ${eventType} to ${repository}.`);
    });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(action);
}

export default action;
