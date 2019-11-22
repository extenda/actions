const core = require('@actions/core');
const { context, GitHub } = require('@actions/github');

const github = new GitHub(process.env.GITHUB_TOKEN);

const getStatusChecks = async (names, context) => {
  const { owner, repo } = context.repo;
  const response = await github.checks.listForRef({
    owner,
    repo,
    ref: context.sha,
    filter: 'latest',
  });

  // Create a map of expected checks.
  let status = names.reduce((map, name) => {
    map[name] = {
      name: name,
      status: 'pending',
      conclusion: 'neutral',
    };
    return map;
  }, {});

  // Reduce our fetched data into our expected checks
  status = response.data.check_runs
    .filter(run => names.includes(run.name))
    .map((run) => {
      return {
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
      };
    }).reduce((map, { name, status, conclusion }) => {
      const entry = map[name];
      if (entry.conclusion !== 'failure') {
        entry.status = status;
        entry.conclusion = conclusion;
      }
      return map;
    }, status);

  return Object.values(status);
};

const logStatus = (status, attempt) => {
  const text = status.map(({ name, status, conclusion }) =>
    `${conclusion.toUpperCase()} [${status}]: ${name}`)
    .join('\n  ');
  core.info(`Status check (#${attempt})\n  ${text}`);
};

const timer = (ms) => new Promise(res => setTimeout(res, ms));

const waitForChecks = async (checks, retryInterval, githubContext = context) => {
  let result = 'pending';
  let attempts = 0;
  while (result === 'pending') {
    attempts += 1;
    const status = await getStatusChecks(checks, githubContext);

    logStatus(status, attempts);

    // Fail fast - If we identify a failed check we are done.
    if (status.find(e => e.conclusion === 'failure')) {
      result = 'failure';
      break;
    }

    // One or more checks are still pending
    if (status.find(e => e.status !== 'completed')) {
      result = 'pending';
      await timer(retryInterval);
      continue;
    }

    // At this point, everything is completed. It should also be all success.
    if (status.filter(e => e.status === 'completed').length === status.length) {
      result = 'success';
      break;
    }
  }

  return result === 'success'
};

module.exports = {
  github,
  waitForChecks,
};
