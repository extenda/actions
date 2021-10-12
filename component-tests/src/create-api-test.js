const { agent } = require('supertest');
const core = require('@actions/core');


/**
 * @param {string} baseUrl
 * @param {string} apiToken
 * @returns {
 * (request: string, { code, body }: { code: number, body?: any }) => import('supertest').Test
 * }
 */
const createApiTest = (baseUrl, apiToken) => {
  let failed = 0;
  let passed = 0;

  const api = agent(baseUrl);
  api.auth(apiToken, { type: 'bearer' });

  return Object.assign(
    async (request, { code, body }) => {
      const [method, url] = request.split(' ');
      let req = api[method.toLowerCase()](url)
        .set({ 'Content-Type': 'application/json' })
        .expect(code);
      if (body !== undefined) req = req.expect(body);
      try {
        await req;
        passed += 1;
        core.info(`PASS: ${request}`);
      } catch (error) {
        failed += 1;
        core.warning(`FAIL: ${request} - ${error.message}`);
      }
    },
    {
      async status() {
        const message = `Tests: ${passed} passed, ${failed} failed, ${
          failed + passed
        } total`;
        if (failed > 0) {
          throw new Error(message);
        }
        core.info(message);
      },
    },
  );
};

module.exports = { createApiTest };
