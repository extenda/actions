const core = require('@actions/core');
const fetch = require('node-fetch');
const { run } = require('../../utils');

run(async () => {
  const title = core.getInput('title');
  const text = core.getInput('text', { required: true });
  const fallback = core.getInput('fallback');
  const token = core.getInput('github-token', { required: true });

  const message = { text };
  if (title) {
    message.title = title;
  }
  if (fallback) {
    message.fallback = fallback;
  }

  const response = await fetch(`https://slack.github.com/repos/${process.env.GITHUB_REPOSITORY}`, {
    method: 'post',
    body: JSON.stringify([message]),
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      authorization: `token ${token}`,
    },
  });

  const body = await response.json();
  core.info(`API status: ${response.status}, body: ${JSON.stringify(body)}`);
});
