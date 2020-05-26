const core = require('@actions/core');
const { GitHub } = require('@actions/github');
const { run } = require('../../utils');
const { getPullRequestInfo } = require('../../utils/src/pull-request-info');
const generateOutputs = require('./generate-outputs');

const outputToMarkdown = ({ module, output }) => [
  `:arrow_forward: **${module}**`,
  '```hcl',
  output,
  '```',
].join('\n');

const createComment = (changes, workingDirectory) => {
  const comment = [];


  if (changes.length === 0) {
    comment.push(
      '**:white_check_mark: No changes**',
      '',
      'Terraform plan reported no changes.',
    );
  } else {
    comment.push(
      '**:earth_americas: Terraform plan changes**',
      '',
      'The output only includes modules with changes.',
      '',
      '<details>',
      `<summary>Show output from ${changes.length} ${changes.length > 1 ? 'modules' : 'module'}</summary>`,
      '',
      ...changes,
      '',
      '</details>',
    );
  }

  comment.push(
    '',
    `*Workflow: \`${process.env.GITHUB_WORKFLOW}\`*`,
    `*Working directory: \`${workingDirectory}\`*`,
  );

  return comment.join('\n');
};

const action = async () => {
  const planFile = core.getInput('plan-file') || 'plan.out';
  const workingDirectory = core.getInput('working-directory') || process.cwd();
  const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN;
  const repository = core.getInput('repository') || process.env.GITHUB_REPOSITORY;
  const pullRequestNumber = core.getInput('pull-request-number');

  if (repository !== process.env.GITHUB_REPOSITORY && !pullRequestNumber) {
    throw new Error('pull-request-number must be provided for remote repository.');
  }

  let pullRequest;
  if (pullRequestNumber) {
    pullRequest = {
      number: pullRequestNumber,
    };
  } else {
    pullRequest = await getPullRequestInfo(githubToken);
    if (!pullRequest) {
      core.warning('Skipping execution - No open pull-request found.');
      return null;
    }
  }

  const comment = await generateOutputs(workingDirectory, planFile)
    .then((outputs) => outputs.map(outputToMarkdown))
    .then((outputs) => createComment(outputs, workingDirectory));

  const client = new GitHub(githubToken);
  const [owner, repo] = repository.split('/');
  await client.issues.createComment({
    owner,
    repo,
    issue_number: pullRequest.number,
    body: comment,
  });

  return comment;
};

if (require.main === module) {
  run(action);
}

module.exports = action;
