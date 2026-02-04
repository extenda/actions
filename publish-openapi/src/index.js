import { fileURLToPath } from 'node:url';
import * as core from '@actions/core';

import { run } from '../../utils/src/index.js';

const action = async () => {
  core.info('THIS ACTION HAS BEEN DEPRECATED');
  core.info('Information for the developer portal:');
  core.info(
    'https://github.com/extenda/hiiretail-developer-docs#hii-retail-developer-portal',
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(action);
}

export default action;
