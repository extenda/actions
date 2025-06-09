const selectSemver = require('../../src/utils/select-semver');

test('It should select preview if greater than stable', () => {
  expect(selectSemver('v1.0.1', 'v1.0.0')).toEqual('v1.0.1');
  expect(selectSemver('v2.0.0', 'v1.0.0')).toEqual('v2.0.0');
});

test('It should select stable if greater than preview', () => {
  expect(selectSemver('v1.0.1', 'v1.1.0')).toEqual('v1.1.0');
});

test('It should select stable if equal', () => {
  expect(selectSemver('v1.0.0', 'v1.0.0')).toEqual('v1.0.0');
});

test('It uses preview version if not a semver version', () => {
  expect(selectSemver('beta', 'v1.0.0')).toEqual('beta');
});
