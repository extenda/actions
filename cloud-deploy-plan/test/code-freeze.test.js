import { expect, test } from 'vitest';

import { isCodeFreeze } from '../src/code-freeze.js';

test('Code freeze in effect', () => {
  const christmas = Date.parse('2025-12-24T12:00:00Z');
  expect(isCodeFreeze(christmas)).toEqual(true);
});

test('Code freeze not in effect before', () => {
  const before = Date.parse('2025-12-18T12:00:00Z');
  expect(isCodeFreeze(before)).toEqual(false);
});

test('Code freeze not in effect after', () => {
  const after = Date.parse('2026-01-10T12:00:00Z');
  expect(isCodeFreeze(after)).toEqual(false);
});
