import * as core from '@actions/core';

const action = async () => {

  core.warning('This action is deprecated and has been disabled!');
  core.warning(
    'Please migrate to the new cloud-deploy Action for continued support and new features.',
  );
  process.exit(0);
};

export default action;
