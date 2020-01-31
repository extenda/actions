const {
  getBranchName,
  isPreRelease,
  getBranchNameFriendly,
  getShortSha,
  getBranchType,
  getComposedVersionString,
} = require('../src/branch-info');

describe('Branch info test suite', () => {
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

  test('getBranchNameFriendly() returns a version suffix friendly string', () => {
    expect(getBranchNameFriendly('feature/RS-1234')).toBe('feature-rs-1234');
    expect(getBranchNameFriendly('feature/RS-1234/lots/of/slash')).toBe('feature-rs-1234-lots-of-slash');
    expect(getBranchNameFriendly('feature/RS-1234_test_branch')).toBe('feature-rs-1234-test-branch');
    expect(getBranchNameFriendly('master')).toBe('master');
    expect(getBranchNameFriendly('Master')).toBe('master');
    expect(getBranchNameFriendly('develop')).toBe('develop');
    expect(getBranchNameFriendly('Dev')).toBe('dev');
    expect(getBranchNameFriendly('Dev')).toBe('dev');

    expect(() => {
      getBranchNameFriendly('');
    }).toThrow();

    expect(() => {
      getBranchNameFriendly(null);
    }).toThrow();
  });

  test('getShortSha() returns a standard short sha from git', async () => {
    const sha = '921103db8259eb9de72f42db8b939895f5651489';
    const shaSize = 10;

    const resultShort = await getShortSha(sha);
    expect(resultShort).toEqual('921103d');

    const resultSize = await getShortSha(sha, shaSize);
    expect(resultSize).toEqual('921103db82');
  });

  test('getBranchType() returns master, dev or feature based on branchNameFriendly', () => {
    expect(getBranchType('mAStER')).toBe('master');
    expect(getBranchType('MASTER')).toBe('master');
    expect(getBranchType('dev')).toBe('dev');
    expect(getBranchType('Dev')).toBe('dev');
    expect(getBranchType('Develop')).toBe('dev');
    expect(getBranchType('Developasdasdasd')).toBe('feature');
    expect(getBranchType('')).toBe('feature');
    expect(getBranchType(null)).toBe('feature');
  });

  test('getComposedVersionString() is correct', () => {
    const version = '1.1.0';
    const buildNumber = '6';
    const shortSha = '921103d';

    expect(getComposedVersionString(version, 'master', buildNumber, shortSha)).toBe('1.1.0');
    expect(getComposedVersionString(version, 'MASTER', buildNumber, shortSha)).toBe('1.1.0');
    expect(getComposedVersionString(version, 'dev', buildNumber, shortSha)).toBe('1.1.0-dev-6-921103d');
    expect(getComposedVersionString(version, 'Dev', buildNumber, shortSha)).toBe('1.1.0-dev-6-921103d');
    expect(getComposedVersionString(version, 'develop', buildNumber, shortSha)).toBe('1.1.0-dev-6-921103d');
    expect(getComposedVersionString(version, 'Develop', buildNumber, shortSha)).toBe('1.1.0-dev-6-921103d');
    expect(getComposedVersionString(version, 'feature-other-stuff', buildNumber, shortSha)).toBe('1.1.0-feature-other-stuff-921103d');
    expect(getComposedVersionString(version, 'Feature-OTHER-Stuff', buildNumber, shortSha)).toBe('1.1.0-feature-other-stuff-921103d');

    expect(() => {
      getComposedVersionString(version, null, buildNumber, shortSha);
    }).toThrow();

    expect(() => {
      getComposedVersionString(version, '', buildNumber, shortSha);
    }).toThrow();
  });
});
