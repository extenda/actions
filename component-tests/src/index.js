import { readFile } from 'node:fs/promises';

import { getInput, setFailed } from '@actions/core';
import { load as parseYaml } from 'js-yaml';

import { createApiTest } from './create-api-test.js';

async function action() {
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

export default action;
