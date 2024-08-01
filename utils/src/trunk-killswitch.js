const isAllowedBranch = (ref) =>
  ref === 'refs/heads/master' || ref === 'refs/heads/main';

/**
 * Raise an error if the branch isn't a master or main branch. This helps us enforce trunk
 * based workflows.
 * @throws Error if invoked on an unexpected branch.
 */
const failIfNotTrunkBased = () => {
  const ref = process.env.GITHUB_REF;
  if (!isAllowedBranch(ref) && !ref.startsWith('refs/tags/')) {
    throw new Error(
      `Action not allowed on ref ${ref}. You must follow trunk-based development and invoke this action from master, main or a release tag`,
    );
  }
};

module.exports = failIfNotTrunkBased;
