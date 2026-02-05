import { getInput, setFailed } from '@actions/core';
import { readFile } from 'fs/promises';
import { load as parseYaml } from 'js-yaml';

import { run } from '../../utils/src/index.js';
import { createApiTest } from './create-api-test.js';

async function main() {
  try {
    const iamToken = getInput('auth-token', { required: true });
    const url = getInput('base-url', { required: true });
    const test = createApiTest(url, iamToken);

    const testsFile = getInput('tests', { required: true });
    const tests = parseYaml(await readFile(testsFile, 'utf8'));

    for (const [request, expected] of Object.entries(tests)) {
      await test(request, expected);
    }

    await test.status();
  } catch (error) {
    setFailed(error.message);
  }
}

// Run the action if we are not running in a test environment
if (!process.env.VITEST && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default main;
