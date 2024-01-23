const core = require('@actions/core');
const { setupPermissions, handlePermissions } = require('./permissions');
const { setupRoles } = require('./roles');

const configureIAM = async (
  iam,
  iamUrl,
  iamToken,
  skipIAM,
) => {
  const {
    'permission-prefix': permissionPrefix,
    permissions,
    roles,
  } = iam;

  const errors = [];

  // Next, update IAM system
  if (!skipIAM) {
    try {
      const fullPermissions = await setupPermissions(permissions, permissionPrefix);
      await handlePermissions(fullPermissions, iamToken, iamUrl);
      await setupRoles(roles, permissionPrefix, iamToken, iamUrl, fullPermissions);
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      core.error(error);
    }
    throw new Error('Errors occurred. Fix issues and rerun the action!');
  }

  return null;
};

module.exports = {
  configureIAM,
};
