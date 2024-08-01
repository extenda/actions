jest.mock('fast-glob');

const fg = require('fast-glob');
const mockFs = require('mock-fs');
const configsFixtures = require('../fixtures/configs');
const { loadDefinitions } = require('../../src/utils/load-sync-definitions');
const { validateExeConfig } = require('../../src/validate/validate-exe-config');

describe('loadDefinitions', () => {
  afterEach(() => {
    mockFs.restore();
  });

  it('loads valid definitions', async () => {
    const glob = 'external-events/*.yaml';
    const file1 = 'external-events/exe.yaml';
    const file2 = 'external-events/tst.yaml';
    fg.sync.mockReturnValue([file1, file2]);

    mockFs({
      [file1]: configsFixtures.valid,
      [file2]: configsFixtures.valid2,
    });

    expect(await loadDefinitions(glob, validateExeConfig)).toEqual({
      [file1]: configsFixtures.validParsed,
      [file2]: configsFixtures.valid2Parsed,
    });
  });

  it('fails, if definition is invalid', async () => {
    const glob = 'external-events/*.yaml';
    const file = 'external-events/exe.yaml';
    fg.sync.mockReturnValue([file]);
    mockFs({ [file]: configsFixtures.invalid });

    await expect(loadDefinitions(glob, validateExeConfig)).rejects.toThrowError(
      'Configuration validation failed (see details above).',
    );
  });

  it('fails, if found multiple files with the same system-prefix', async () => {
    const glob = 'external-events/*.yaml';
    const file1 = 'external-events/exe1.yaml';
    const file2 = 'external-events/exe2.yaml';
    fg.sync.mockReturnValue([file1, file2]);

    mockFs({
      [file1]: configsFixtures.valid,
      [file2]: configsFixtures.valid,
    });

    await expect(loadDefinitions(glob, validateExeConfig)).rejects.toThrowError(
      'Configuration validation failed (see details above).',
    );
  });
});
