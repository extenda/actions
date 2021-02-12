const core = require('@actions/core');
const fetch = require('node-fetch');
const { run, loadGitHubToken } = require('../../utils');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const createMessage = (title, text, fallback) => {
  const message = { text };
  if (title) {
    message.title = title;
  }
  if (fallback) {
    message.fallback = fallback;
  }
  return [message];
};

run(async () => {
  const title = core.getInput('title');
  const text = core.getInput('text', { required: true });
  const fallback = core.getInput('fallback');
  const token = await loadGitHubToken(loadSecret);

  const response = await fetch(`https://slack.github.com/repos/${process.env.GITHUB_REPOSITORY}`, {
    method: 'post',
    body: JSON.stringify(createMessage(title, text, fallback)),
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      authorization: `token ${token}`,
    },
  });

  const body = await response.json();
  core.info(`API status: ${response.status}, body: ${JSON.stringify(body)}`);
});
