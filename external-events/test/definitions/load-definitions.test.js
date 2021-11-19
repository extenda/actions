jest.mock('fast-glob');

const fg = require('fast-glob');
const mockFs = require('mock-fs');
const { loadDefinitions } = require('../../src/definitions/load-definitions');
const configsFixtures = require('../fixtures/configs');

describe('loadDefinitions', () => {
  afterEach(() => {
    mockFs.restore();
  });

  it('loads valid definitions', async () => {
    const glob = 'external-events/*.yaml';
    const file = 'external-events/exe.yaml';
    fg.sync.mockReturnValue([file]);
    mockFs({ [file]: configsFixtures.valid });

    expect(await loadDefinitions(glob)).toEqual({ [file]: configsFixtures.validParsed });
  });

  it('fails, if definition is invalid', async () => {
    const glob = 'external-events/*.yaml';
    const file = 'external-events/exe.yaml';
    fg.sync.mockReturnValue([file]);
    mockFs({ [file]: configsFixtures.invalid });

    await expect(loadDefinitions(glob)).rejects.toThrowError('Configuration validation failed (see details above).');
  });
});
