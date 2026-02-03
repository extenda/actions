import { expect, test } from 'vitest';

import resolveServiceFiles from '../src/service-files.js';

test('It resolves a relative path', () => {
  const files = resolveServiceFiles([
    'cloud-deploy-plan/**/deploy-*.js',
    'cloud-deploy/**/*-manifests*.js',
  ]);
  expect(files).toEqual([
    'cloud-deploy-plan/src/deploy-info.js',
    'cloud-deploy-plan/test/deploy-info.test.js',
    'cloud-deploy/src/manifests/build-manifests-gke.js',
    'cloud-deploy/src/manifests/build-manifests-run.js',
  ]);
});
