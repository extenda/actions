import { describe, expect, test } from 'vitest';

import { defaultRegistry, getRegistryUrl } from '../src/url-helper.js';

describe('Registry URL is sane', () => {
  test('Input URL is correct', () => {
    const dockerHubRegistry =
      'https://hub.docker.com/_/microsoft-dotnet-core-aspnet/';
    expect(getRegistryUrl(dockerHubRegistry)).toBe(dockerHubRegistry);
  });

  test('Default URL', () => {
    expect(getRegistryUrl()).toBe(defaultRegistry);
  });
});
