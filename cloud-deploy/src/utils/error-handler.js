const core = require('@actions/core');

const handleError = async (errorMessage, action) => {
  let message = `${action} succeded`;
  if (errorMessage.includes('Required') || errorMessage.includes('AccessDeniedException:')) {
    // if failing on required permission error send to error list
    message = 'Permissions are missing for your ci-cd account, verify you have all required permissions mentioned in the migration docs: https://docs.google.com/document/d/1uQjorCDupWN0i7MOK34f-RnkzgYvsnv24YdsXkAYEkE';
    throw new Error(message);
  }
  if (errorMessage.includes('already exists') || errorMessage.includes('Duplicate network endpoint')) {
    message = `${action} failed with: already exists`;
  }
  if (errorMessage.includes('was not found' || !action.includes('Remove'))) {
    message = `${action} failed with: was not found, creating...`;
  }
  core.info(message);
};

module.exports = handleError;
