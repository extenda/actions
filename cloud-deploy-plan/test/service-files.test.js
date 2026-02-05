import mockFs from 'mock-fs';
import { afterEach, expect, test } from 'vitest';

import resolveServiceFiles from '../src/service-files.js';

afterEach(() => {
  mockFs.restore();
});

test('It resolves a relative path', () => {
  mockFs({
    'cloud-deploy-plan/src/deploy-info.js': '',
    'cloud-deploy-plan/test/deploy-info.test.js': '',
    'cloud-deploy/src/manifests/build-manifests-gke.js': '',
    'cloud-deploy/src/manifests/build-manifests-run.js': '',
    'cloud-deploy/README.md': '', // Should NOT be matched
  });

  const files = resolveServiceFiles([
    'cloud-deploy-plan/**/deploy-*.js',
    'cloud-deploy/**/*-manifests*.js',
  ]);
  expect(files).toHaveLength(4);
  expect(files).toEqual(
    expect.arrayContaining([
      'cloud-deploy-plan/src/deploy-info.js',
      'cloud-deploy-plan/test/deploy-info.test.js',
      'cloud-deploy/src/manifests/build-manifests-gke.js',
      'cloud-deploy/src/manifests/build-manifests-run.js',
    ]),
  );
});
