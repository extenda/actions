const getLatestVersion = require('../src/latest-version');

describe('Latest gcloud version', () => {
  test('It can find the latest gcloud CLI version', async () => {
    const version = await getLatestVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
