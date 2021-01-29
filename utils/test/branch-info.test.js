const {
  getBranchName,
  isPreRelease,
  getBranchNameFriendly,
  getBranchNameShort,
  getBranchNameSemver,
  getShortSha,
  getBranchType,
  getComposedVersionString,
  getTagAtCommit,
} = require('../src/branch-info');

describe('Branch info test suite', () => {
  test('getBranchName() returns branch name or null', () => {
    expect(getBranchName('refs/heads/feature/RS-1234')).toBe('feature/RS-1234');
    expect(getBranchName('refs/heads/feature/RS-1234_test_branch')).toBe('feature/RS-1234_test_branch');
    expect(() => {
      getBranchName('wrong string');
    }).toThrow();
    expect(() => {
      getBranchName(null);
    }).toThrow();
    expect(() => {
      getBranchName(undefined);
    }).toThrow();
    expect(() => {
      getBranchName();
    }).toThrow();
    expect(() => {
      getBranchName('');
    }).toThrow();
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

  test('getBranchNameShort() returns last branch name or null', () => {
    expect(getBranchNameShort('refs/heads/feature/RS-1234')).toBe('RS-1234');
    expect(getBranchNameShort('refs/heads/feature/RS-1234_test_branch')).toBe('RS-1234_test_branch');
    expect(getBranchNameShort('master')).toBe('master');
    expect(getBranchNameShort('develop')).toBe('develop');
    expect(() => {
      getBranchNameShort('wrong string');
    }).toThrow();
    expect(() => {
      getBranchNameShort(null);
    }).toThrow();
    expect(() => {
      getBranchNameShort(undefined);
    }).toThrow();
    expect(() => {
      getBranchNameShort();
    }).toThrow();
    expect(() => {
      getBranchNameShort('');
    }).toThrow();
  });

  test('getBranchNameSemver() returns branch name with a-z and 0-9 only', () => {
    expect(getBranchNameSemver('refs/heads/feature/RS-1234')).toBe('featureRS1234');
    expect(getBranchNameSemver('master')).toBe('master');
    expect(getBranchNameSemver('develop')).toBe('develop');
    expect(() => {
      getBranchNameSemver('#¤#__:');
    }).toThrow();
    expect(() => {
      getBranchNameSemver(null);
    }).toThrow();
    expect(() => {
      getBranchNameSemver(undefined);
    }).toThrow();
    expect(() => {
      getBranchNameSemver();
    }).toThrow();
    expect(() => {
      getBranchNameSemver('');
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

  test('getTagAtCommit() returns a semantic version for tagged commits', async () => {
    const tag = await getTagAtCommit('63633c0');
    expect(tag).toEqual('v0.18.0');
  });

  test('gitTagAtCommit() returns empty string for untagged commits', async () => {
    const tag = await getTagAtCommit('382aee2');
    expect(tag).toEqual('');
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
