import * as core from '@actions/core';

import { run } from '../../utils/src.js';

const action = async () => {
  core.info('THIS ACTION HAS BEEN DEPRECATED');
  core.info('Information for the developer portal:');
  core.info(
    'https://github.com/extenda/hiiretail-developer-docs#hii-retail-developer-portal',
  );
};

// Entry point check removed for ESM compatibility

export default action;
