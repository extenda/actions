const core = require('@actions/core');
const { run } = require('../../utils');
const { setupGcloud } = require('../../setup-gcloud');
const loadServiceDefinition = require('../../cloud-deploy/src/utils/service-definition');
const getToken = require('../../cloud-deploy/src/utils/identity-token');
const getDeployInfo = require('./deploy-info');
const createComment = require('./create-comment');
const { getPullRequestNumber, postComment } = require('./pr-comment');
const resolveServiceFiles = require('./service-files');
const { isCodeFreeze, getFreezeEnd } = require('./code-freeze');

const action = async () => {
  const serviceAccountKeyCICD = core.getInput('service-account-key', {
    required: true,
  });
  const serviceFiles = resolveServiceFiles(
    core.getMultilineInput('service-definition') || ['cloud-deploy.yaml'],
  );
  const githubToken = core.getInput('github-token', { required: true });

  const issueId = await getPullRequestNumber(githubToken);
  if (isNaN(issueId)) {
    core.warning(
      'No pull request found. Please run action from a pull_request workflow',
    );
  } else {
    // Ensure our gcloud is available and installed.
    const projectId = await setupGcloud(serviceAccountKeyCICD, 'latest');
    const bearerToken = await getToken();

    const plans = await Promise.all(
      serviceFiles
        .map((file) => {
          const service = loadServiceDefinition(file);
          service.filename = file;
          return service;
        })
        .map((service) =>
          getDeployInfo(service, projectId, bearerToken).then((deployInfo) =>
            createComment(service.filename, deployInfo),
          ),
        ),
    );

    const comment = [
      '## :mag: Cloud Deploy plan\n',
      'This plan outlines the infrastructure changes that would be applied if this pull request is merged. ' +
        'The plan does not include changes to the service itself unless they also impact infrastructure not ' +
        'controlled through the cloud-deploy manifests.',
    ];

    if (isCodeFreeze(Date.now())) {
      comment.push(
        '',
        '> [!IMPORTANT]',
        `> A code freeze is currently in effect. The freeze will end ${getFreezeEnd().toISOString()}.`,
      );
    }

    comment.push(plans.join('\n\n-----\n\n'));

    await postComment(githubToken, issueId, comment.join('\n'));
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
