const { getInput, setFailed } = require('@actions/core');
const { load: parseYaml } = require('js-yaml');
const { readFile } = require('fs').promises;
const { createApiTest } = require('./create-api-test');
const { run } = require('../../utils');

async function main() {
  try {
    const iamToken = getInput('auth-token', { required: true });
    const url = getInput('base-url', { required: true });
    const test = createApiTest(url, iamToken);

    const testsFile = getInput('tests', { required: true });
    const tests = parseYaml(await readFile(testsFile));

    for (const [request, expected] of Object.entries(tests)) {
      await test(request, expected);
    }

    await test.status();
  } catch (error) {
    setFailed(error.message);
  }
}

if (require.main === module) {
  run(main);
}

module.exports = main;
