const { context, GitHub } = require('@actions/github');
const core = require('@actions/core');

const formatComment = (data) => {
  const comment = [];
  data.conditions.forEach((condition) => {
    const key = condition.metricKey.replace(/_/g, ' ');
    let line = `${condition.status} ${key}: ${condition.actualValue}`;
    if (condition.warningThreshold) {
      line += ` warning at ${condition.warningThreshold}`;
    }
    line += ` error at ${condition.errorThreshold}`;
    comment.push(line);
  });
  return comment.join('\n');
};

const postComment = async (qgStatus) => {
  const event = context.payload;
  if (event.pull_request) {
    const { pull_request: { number } } = event;
    const github = new GitHub(process.env.GITHUB_TOKEN);
    const { owner, repo } = context.repo;

    return github.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body: formatComment(qgStatus),
    }).then(() => {
      core.info('Posted Quality Gate status to pull request');
    });
  }
  return null;
};

module.exports = {
  postComment,
};
