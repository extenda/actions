import { expect, test } from 'vitest';

import { findExecutable } from '../src/exec-gcloud.js';

test('It picks gcloud', () => {
  expect(findExecutable('gcloud')).toEqual('gcloud');
  expect(findExecutable(undefined)).toEqual('gcloud');
  expect(findExecutable(null)).toEqual('gcloud');
});

test('It picks gsutil', () => {
  expect(findExecutable('gsutil')).toEqual('gsutil');
});
