const core = require('@actions/core');
const { GitHub } = require('@actions/github');
const { run } = require('../../utils');
const { getPullRequestInfo } = require('../../utils/src/pull-request-info');
const generateOutputs = require('./generate-outputs');

const moduleEmoji = (summary) => {
  if (!summary.includes('0 to destroy')) {
    return ':closed_book:';
  }
  if (!summary.includes('0 to change')) {
    return ':orange_book:';
  }
  return ':green_book:';
};

const outputToMarkdown = ({ module, output }) => {
  const summary = output.trim().split('\n').pop();
  const emoji = moduleEmoji(summary);
  return [
    `#### ${emoji} \`${module}\``,
    '',
    '<details>',
    `<summary>${summary}</summary>`,
    '',
    '```hcl',
    output,
    '```',
    '',
    '</details>',
    '',
  ].join('\n');
};

const createComment = (changes, workingDirectory, footer) => {
  const comment = [];
  if (changes.length === 0) {
    comment.push(
      '### :white_check_mark: Terraform plan with no changes',
      '',
      'Terraform plan reported no changes.',
      '',
    );
  } else {
    comment.push(
      '### :mag: Terraform plan changes',
      '',
      'The output only includes modules with changes.',
      '',
      ...changes,
    );
  }

  if (footer) {
    comment.push(
      // Remove line breaks, but preserve paragraphs.
      footer.split('\n\n').map((p) => p.replace('\n', ' ')).join('\n\n'),
      '',
    );
  }

  comment.push(
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
  const footer = core.getInput('footer');

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
    .then((outputs) => createComment(outputs, workingDirectory, footer));

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
