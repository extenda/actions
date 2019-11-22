const checks = require('../src/status-checks');

const listForRef = jest.fn();
checks.github.checks.listForRef = listForRef;
listForRef.mockResolvedValue(require('./response.json'));

const context = {
  repo: {
    owner: 'extenda',
    repo: 'actions',
  },
  sha: 'abc123',
};

describe('Status Checks', () => {
  test('Checks failed', async () => {
    const status = await checks.waitForChecks(['test', 'acceptance-web'], 1, context);
    expect(status).toEqual(false);
  });

  test('Checks success', async () => {
    const status = await checks.waitForChecks(['test'], 1, context);
    expect(status).toEqual(true);
  });
});
