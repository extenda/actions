import semver from 'semver';
import { describe, expect, test } from 'vitest';

import * as versions from '../src/versions.js';

describe('Versions', () => {
  test('It can find the latest release tag for a prefix', async () => {
    versions.setTagPrefix('v');
    const tag = await versions.getLatestReleaseTag();
    expect(semver.gte(tag, 'v0.62.0')).toEqual(true);
    expect(tag).not.toEqual('v0.0.0');
  });

  test('It will use default version if no release exists', async () => {
    versions.setTagPrefix('test-tag-');
    const tag = await versions.getLatestReleaseTag();
    expect(tag).toEqual('test-tag-0.0.0');
  });

  test('it returns a build version', async () => {
    versions.setTagPrefix('v');
    const buildVersion = await versions.getBuildVersion();
    expect(semver.gte(buildVersion, '0.62.0'));
  });
});
