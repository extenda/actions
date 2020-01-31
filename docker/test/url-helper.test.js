const urlhelper = require('../src/url-helper');

describe('Registry URL is sane', () => {
  test('Input URL is correct', () => {
    const dockerHubRegistry = 'https://hub.docker.com/_/microsoft-dotnet-core-aspnet/';
    expect(urlhelper.getRegistryUrl(dockerHubRegistry)).toBe(dockerHubRegistry);
  });

  test('Default URL + input registry trimmed', () => {
    const extendaRegistry = '/EXTENDA/rs-postal';
    expect(urlhelper.getRegistryUrl(extendaRegistry)).toBe(`${urlhelper.defaultBaseUrl}extenda/rs-postal`);
  });

  test('Default URL + input registry', () => {
    const extendaRegistry = 'extenda/rs-postal';
    expect(urlhelper.getRegistryUrl(extendaRegistry)).toBe(`${urlhelper.defaultBaseUrl}extenda/rs-postal`);
  });
});

describe('Registry URL is erronous', () => {
  test('Input URL is null', () => {
    expect(() => {
      expect(urlhelper.getRegistryUrl(null)).toThrow();
    }).toThrow();
  });

  test('Input URL is undefined', () => {
    expect(() => {
      expect(urlhelper.getRegistryUrl(null)).toThrow();
    }).toThrow();
  });

  test('Input URL is empty string', () => {
    expect(() => {
      expect(urlhelper.getRegistryUrl(null)).toThrow();
    }).toThrow();
  });
});
