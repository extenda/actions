const { getBranchName, isPreRelease, getSuffix } = require('../src/branch-helper');

describe('Branch helper test suite', () => {
  test('getBranchName() returns branch name or null', () => {
    expect(getBranchName('refs/heads/feature/RS-1234')).toBe('feature/RS-1234');
    expect(getBranchName('refs/heads/feature/RS-1234_test_branch')).toBe('feature/RS-1234_test_branch');
    expect(getBranchName('wrong string')).toBe(null);
    expect(getBranchName(null)).toBe(null);
    expect(getBranchName(undefined)).toBe(null);
    expect(getBranchName()).toBe(null);
    expect(getBranchName('')).toBe(null);
  });

  test('isPreRelease() returns true if branch is not master', () => {
    expect(isPreRelease('master')).toBe(false);
    expect(isPreRelease('feature/RS-1234')).toBe(true);
    expect(isPreRelease('feature/supermaster')).toBe(true);
    expect(isPreRelease('supermaster')).toBe(true);
  });

  test('getSuffix() returns a version suffix friendly string', () => {
    expect(getSuffix('feature/RS-1234')).toBe('feature-RS-1234');
    expect(getSuffix('feature/RS-1234/lots/of/slash')).toBe('feature-RS-1234-lots-of-slash');
    expect(getSuffix('feature/RS-1234_test_branch')).toBe('feature-RS-1234-test-branch');
    expect(getSuffix('master')).toBe('');
  });
});
