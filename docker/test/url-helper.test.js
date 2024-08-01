const urlhelper = require('../src/url-helper');

describe('Registry URL is sane', () => {
  test('Input URL is correct', () => {
    const dockerHubRegistry =
      'https://hub.docker.com/_/microsoft-dotnet-core-aspnet/';
    expect(urlhelper.getRegistryUrl(dockerHubRegistry)).toBe(dockerHubRegistry);
  });

  test('Default URL', () => {
    expect(urlhelper.getRegistryUrl()).toBe(urlhelper.defaultRegistry);
  });
});
