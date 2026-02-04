import mockFs from 'mock-fs';
import { afterEach, describe, expect, it } from 'vitest';

import { loadDefinitions } from '../../../external-events/src/utils/load-sync-definitions.js';
import { validateCccConfig } from '../../src/validate/validate-ccc-config.js';
import * as configsFixtures from '../fixtures/configs.js';

describe('loadDefinitions (CCC)', () => {
  afterEach(() => {
    mockFs.restore();
  });

  it('loads valid definitions', async () => {
    const glob = 'customer-config/*.yaml';
    const file1 = 'customer-config/ccc.yaml';
    const file2 = 'customer-config/tst.yaml';

    mockFs({
      [file1]: configsFixtures.valid,
      [file2]: configsFixtures.valid2,
    });

    expect(await loadDefinitions(glob, validateCccConfig)).toEqual({
      [file1]: configsFixtures.validParsed,
      [file2]: configsFixtures.valid2Parsed,
    });
  });

  it('fails, if definition is invalid', async () => {
    const glob = 'customer-config/*.yaml';
    const file = 'customer-config/ccc.yaml';

    mockFs({ [file]: configsFixtures.invalid });

    await expect(loadDefinitions(glob, validateCccConfig)).rejects.toThrow(
      'Configuration validation failed (see details above).',
    );
  });

  it('fails, if found multiple files with the same system-prefix', async () => {
    const glob = 'customer-config/*.yaml';
    const file1 = 'customer-config/ccc1.yaml';
    const file2 = 'customer-config/ccc2.yaml';

    mockFs({
      [file1]: configsFixtures.valid,
      [file2]: configsFixtures.valid,
    });

    await expect(loadDefinitions(glob, validateCccConfig)).rejects.toThrow(
      'Configuration validation failed (see details above).',
    );
  });
});
