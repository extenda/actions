const getRuntimeAccount = (runtimeAccountEmail, projectId) => {
  if (runtimeAccountEmail.includes('@')) {
    return runtimeAccountEmail;
  }
  return `${runtimeAccountEmail}@${projectId}.iam.gserviceaccount.com`;
};

module.exports = getRuntimeAccount;
