/**
 * Get the job-scoped directory path for credential and config files.
 * This ensures consistency across all setup-gcloud operations.
 *
 * @param {Object} options - configuration options
 * @param {string} [options.prefix='setup-gcloud'] - directory prefix
 * @returns {string} the job-scoped directory path
 */
export function getJobScope({ prefix = 'setup-gcloud' } = {}) {
  const { RUNNER_TEMP, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT } = process.env;

  if (!RUNNER_TEMP || !GITHUB_RUN_ID) {
    throw new Error(
      'RUNNER_TEMP and GITHUB_RUN_ID environment variables are required',
    );
  }

  return `${RUNNER_TEMP}/${prefix}-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT || '1'}`;
}
