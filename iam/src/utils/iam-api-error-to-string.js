/**
 *
 * @param e {Error} - http error from iam api
 * @param description {string} - text description for error
 * @return text {string} - error as a string
 */

function iamApiErrorToString(e, description = 'IAM API Error') {
  if (e.response) {
    const { data: { messages, error }, status } = e.response;
    return `${description}. Request failed with code [${status}] and error [${messages || error}]`;
  }

  return `${description}. Unexpected error for iam api: ${e.message}`;
}

module.exports = { iamApiErrorToString };
