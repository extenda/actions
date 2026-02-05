import * as core from '@actions/core';

import getToken from '../../cloud-deploy/src/utils/identity-token.js';
import loadServiceDefinition from '../../cloud-deploy/src/utils/service-definition.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { getFreezeEnd, isCodeFreeze } from './code-freeze.js';
import createComment from './create-comment.js';
import getDeployInfo from './deploy-info.js';
import { getPullRequestNumber, postComment } from './pr-comment.js';
import resolveServiceFiles from './service-files.js';

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

export default action;
