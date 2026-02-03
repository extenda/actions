import { afterEach, beforeEach, expect, test } from 'vitest';

import failIfNotTrunkBased from '../src/trunk-killswitch.js';

const orgEnv = process.env;

beforeEach(() => {
  process.env = { ...orgEnv };
});

afterEach(() => {
  process.env = orgEnv;
});

test('It throws if feature branch', () => {
  process.env.GITHUB_REF = 'refs/heads/feature/test-name';
  expect(() => failIfNotTrunkBased()).toThrow(
    /^Action not allowed on ref refs\/heads\/feature\/test-name/,
  );
});

test('It allows from main branch', () => {
  process.env.GITHUB_REF = 'refs/heads/main';
  expect(() => failIfNotTrunkBased()).not.toThrow();
});

test('It allows master branch', () => {
  process.env.GITHUB_REF = 'refs/heads/master';
  expect(() => failIfNotTrunkBased()).not.toThrow();
});

test('It allows a tag reference', () => {
  process.env.GITHUB_REF = 'refs/tags/v1.0.0';
  expect(() => failIfNotTrunkBased()).not.toThrow();
});
