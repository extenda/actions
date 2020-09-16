const semver = require('semver');
const versions = require('../src/versions');

describe('Versions', () => {
  test('It can find the latest release tag for a prefix', async () => {
    versions.setTagPrefix('v');
    const tag = await versions.getLatestReleaseTag();
    expect(semver.gte(tag, 'v0.62.0')).toEqual(true);
    expect(tag).not.toEqual('v0.0.0');
  });

  test('It will use default version if no release exists', async () => {
    versions.setTagPrefix('test-');
    const tag = await versions.getLatestReleaseTag();
    expect(tag).toEqual('test-0.0.0');
  });
});
