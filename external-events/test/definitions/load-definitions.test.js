import mockFs from 'mock-fs';
import { afterEach, describe, expect, it } from 'vitest';

import { loadDefinitions } from '../../src/utils/load-sync-definitions.js';
import { validateExeConfig } from '../../src/validate/validate-exe-config.js';
import * as configsFixtures from '../fixtures/configs.js';

describe('loadDefinitions (EXE)', () => {
  afterEach(() => {
    mockFs.restore();
  });

  it('loads valid definitions', async () => {
    const glob = 'external-events/*.yaml';
    const file1 = 'external-events/exe.yaml';
    const file2 = 'external-events/tst.yaml';

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

    mockFs({ [file]: configsFixtures.invalid });

    await expect(loadDefinitions(glob, validateExeConfig)).rejects.toThrow(
      'Configuration validation failed (see details above).',
    );
  });

  it('fails, if found multiple files with the same system-prefix', async () => {
    const glob = 'external-events/*.yaml';
    const file1 = 'external-events/exe1.yaml';
    const file2 = 'external-events/exe2.yaml';

    mockFs({
      [file1]: configsFixtures.valid,
      [file2]: configsFixtures.valid,
    });

    await expect(loadDefinitions(glob, validateExeConfig)).rejects.toThrow(
      'Configuration validation failed (see details above).',
    );
  });
});
