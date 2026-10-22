import * as core from '@actions/core';
import * as github from '@actions/github';

import { getPullRequestInfo } from '../../utils/src/pull-request-info.js';
import DestroyedResources from './destroyed-resources.js';
import generateOutputs, { terraformShowJson } from './generate-outputs.js';

const moduleEmoji = (summary) => {
  if (!summary.includes(', 0 to destroy')) {
    return ':closed_book:';
  }
  if (!summary.includes(', 0 to change')) {
    return ':orange_book:';
  }
  return ':green_book:';
};

const outputToMarkdown = ({ module, output }) => {
  const planSummary = output.match(/Plan:.+/);
  const summary = planSummary
    ? planSummary[0]
    : output.trim().split('\n').pop();
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

const createComment = (
  changes,
  workingDirectory,
  footer,
  destroyedReport,
  behindReport,
) => {
  const comment = [];
  const addDestroyedReport = () => {
    if (behindReport) {
      comment.push('---', behindReport, '');
    }
    comment.push(
      '---',
      '### :warning: You are about to destroy some resources',
      '',
      ...destroyedReport,
      'Also check the following <ins>before</ins> applying:',
      '* Make sure that no customers are using your resource.',
      '* Other destroyed resources are not checked automatically.',
      '  * Search on https://github.com/extenda for your resource in all repositories.',
      '---',
    );
  };
  if (changes.length === 0) {
    comment.push(
      '### :white_check_mark: Terraform plan with no changes',
      '',
      'Terraform plan reported no changes.',
      '',
    );
  } else {
    // Convert changes to string
    const changesString = changes.toString();
    const commentLimit = 250000;
    // If changes + footer + header is longer than 260000 chars the comment will fail
    // Footer is usually around 1000 chars
    if (changesString.length > commentLimit) {
      comment.push(
        '### :mag: Terraform plan changes',
        '',
        'The plan is to long to post in a github comment',
        'Verify the Terraform plan output in the plan action',
        'If the plan looks alright it can be applied according to below',
        '',
      );
      if (changesString.includes('destroyed') && destroyedReport) {
        addDestroyedReport();
      }
    } else {
      comment.push(
        '### :mag: Terraform plan changes',
        '',
        'The output only includes modules with changes.',
        '',
        ...changes,
      );
      if (changesString.includes('destroyed') && destroyedReport) {
        addDestroyedReport();
      } else if (changesString.includes('destroyed')) {
        comment.push(
          '---',
          '### :warning: You are about to destroy some resources',
          'Check the following <ins>before</ins> applying:',
          '* Make sure that no customers are using your resource.',
          '* Make sure the resource is not used anywhere.',
          '  * Search on https://github.com/extenda for your resource in all repositories.',
          "* Make sure your common repository doesn't contain any configuration of your resource.",
          '---',
        );
      }
    }
  }

  if (footer) {
    comment.push(footer, '');
  }

  comment.push(
    `*Workflow: \`${process.env.GITHUB_WORKFLOW}\`*`,
    `*Working directory: \`${workingDirectory}\`*`,
  );

  return comment.join('\n');
};

/**
 * Check if destroyed resources are still in use. Only reads and warns: on any
 * error the comment falls back to the static checklist.
 */
const checkDestroyedResources = async (
  outputs,
  token,
  repository,
  pullRequestNumber,
  fallbackToken,
) => {
  if (!outputs.some(({ output }) => / [1-9]\d* to destroy/.test(output))) {
    return null;
  }
  try {
    const checker = new DestroyedResources(github.getOctokit(token), {
      org: repository.split('/')[0],
      repository,
      pullRequestNumber,
      fallbackToken,
    });
    await checker.collect(outputs, terraformShowJson);
    await checker.check();
    const report = checker.render();
    return report && { report, behind: checker.behind };
  } catch (err) {
    core.warning(`Could not check destroyed resources: ${err.message}`);
    return null;
  }
};

const action = async () => {
  const planFile = core.getInput('plan-file') || 'plan.out';
  const workingDirectory = core.getInput('working-directory') || process.cwd();
  const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN;
  const repository =
    core.getInput('repository') || process.env.GITHUB_REPOSITORY;
  const pullRequestNumber = core.getInput('pull-request-number');
  const footer = core.getInput('footer');
  const maxThreads = core.getInput('max-terraform-processes');
  const ignoredResourcesRegexp = core.getInput('ignored-resources-regexp');
  const checkDestroyed = core.getInput('check-destroyed-resources') !== 'false';
  const destroyedToken = core.getInput('check-destroyed-resources-token');
  const checkToken = destroyedToken || githubToken;

  if (repository !== process.env.GITHUB_REPOSITORY && !pullRequestNumber) {
    throw new Error(
      'pull-request-number must be provided for remote repository.',
    );
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

  const outputs = await generateOutputs(
    workingDirectory,
    planFile,
    maxThreads,
    ignoredResourcesRegexp,
  );
  const destroyed = checkDestroyed
    ? await checkDestroyedResources(
        outputs,
        checkToken,
        repository,
        pullRequest.number,
        !destroyedToken,
      )
    : null;
  const comment = createComment(
    outputs.map(outputToMarkdown),
    workingDirectory,
    footer,
    destroyed?.report,
    destroyed?.behind,
  );

  const octokit = github.getOctokit(githubToken);
  const [owner, repo] = repository.split('/');

  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pullRequest.number,
  });

  const skipDeleting = comments.some((iterComment) =>
    iterComment.body.includes('Applied the following directories'),
  );

  for (const iterComment of comments) {
    if (
      (iterComment.body.includes(
        ':white_check_mark: Terraform plan with no changes',
      ) ||
        iterComment.body.includes(':mag: Terraform plan changes')) &&
      !skipDeleting
    ) {
      octokit.rest.issues.deleteComment({
        owner,
        repo,
        comment_id: iterComment.id,
      });
    }
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullRequest.number,
    body: comment,
  });

  return comment;
};

export default action;
