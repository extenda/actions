const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const { run } = require('../../utils');
const { getPullRequestInfo } = require('../../utils/src/pull-request-info');
const generateOutputs = require('./generate-outputs');

const outputToMarkdown = ({ module, output }) => [
  `:arrow_forward: **${module}**`,
  '```hcl',
  output,
  '```',
].join('\n');

const createComment = (changes, jobId) => {
  const comment = [];


  if (changes.length === 0) {
    comment.push(
      ':white_check_mark: **No changes**',
      '',
      'Terraform plan reported no changes.',
    );
  } else {
    comment.push(
      ':volcano: **Terraform plan changes**',
      '',
      'The output only includes modules with changes.',
      '',
      '<details>',
      '<summary>Show Output</summary>',
      '',
      ...changes,
      '',
      '</details>',
    );
  }

  comment.push(
    '',
    `*Workflow: \`${process.env.GITHUB_WORKFLOW}.${jobId}\`*`,
  );

  return comment.join('\n');
};

const action = async () => {
  const planFile = core.getInput('plan-file') || 'plan.out';
  const workingDirectory = core.getInput('working-directory') || process.cwd();
  const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN;
  const jobId = core.getInput('job-id') || 'unknown';

  const pullRequest = await getPullRequestInfo(githubToken);
  if (!pullRequest) {
    core.warning('Skipping execution - No open pull-request found.');
    return null;
  }

  const comment = await generateOutputs(workingDirectory, planFile)
    .then((outputs) => outputs.map(outputToMarkdown))
    .then((outputs) => createComment(outputs, jobId));

  const client = new GitHub(githubToken);
  const { owner, repo } = context.repo;
  await client.pulls.createComment({
    owner,
    repo,
    pull_number: pullRequest.number,
    body: comment,
  });

  return comment;
};

if (require.main === module) {
  run(action);
}

module.exports = action;
