import core from '@actions/core';
import github from '@actions/github';

import { getPullRequestInfo } from '../../utils/src/pull-request-info';

const getPullRequestNumber = async (githubToken) => {
  const pr = await getPullRequestInfo(githubToken);
  const { number = NaN } = pr || {};
  return number;
};

const postComment = async (githubToken, issueId, comment) => {
  const octokit = github.getOctokit(githubToken);
  const { owner, repo } = github.context.repo;

  const marker = '<i>Posted by extenda/actions/cloud-deploy-plan</i>';
  const body = `${comment}\n\n${marker}\n<i>${new Date().toISOString()}</i>`;

  const { data: comments = [] } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueId,
  });

  const existingComment = comments.find((c) => c.body.includes(marker));
  if (existingComment) {
    const commentId = existingComment.id;
    core.info(`Update comment ${commentId}`);
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body,
    });
  } else {
    core.info('Create new comment');
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueId,
      body,
    });
  }
};

module.exports = {
  getPullRequestNumber,
  postComment,
};
