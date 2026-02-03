import { SemVer, valid } from 'semver';

/**
 * Ensure that a preview semantic version only gets used if it is semantically greater than the stable version.
 * @param previewVersion a preview semantic version
 * @param stableVersion a stable semantic version
 * @return the version to use
 */
const selectSemver = (previewVersion, stableVersion) => {
  if (!valid(previewVersion)) {
    // Preview is not a semver. Typically this means it is a tag such as 'beta' or similar.
    return previewVersion;
  }
  const value = new SemVer(previewVersion).compare(new SemVer(stableVersion));
  if (value > 0) {
    // Preview is greater than the stable version.
    return previewVersion;
  }
  return stableVersion;
};

module.exports = selectSemver;
