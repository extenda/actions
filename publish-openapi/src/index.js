import core from '@actions/core';

import { run } from '../../utils/src';

const action = async () => {
  core.info('THIS ACTION HAS BEEN DEPRECATED');
  core.info('Information for the developer portal:');
  core.info(
    'https://github.com/extenda/hiiretail-developer-docs#hii-retail-developer-portal',
  );
};

if (require.main === module) {
  run(action);
}

module.exports = action;
