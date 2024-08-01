const core = require('@actions/core');
const github = require('@actions/github');
const { run, loadGitHubToken } = require('../../utils');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

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

if (require.main === module) {
  run(action);
}

module.exports = action;
