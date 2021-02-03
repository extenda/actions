const git = require('simple-git/promise')();

const isPreRelease = (branchName) => branchName !== 'master';

const getBranchType = (branchName) => {
  const devPattern = /(^dev$|^develop$)/gmi;
  const masterPattern = /^master$/gmi;

  if (devPattern.test(branchName)) {
    return 'dev';
  }

  if (masterPattern.test(branchName)) {
    return 'master';
  }

  return 'feature';
};

const getBranchName = (currentRef) => {
  if (!currentRef) {
    throw new Error('Can not return a branchname for null');
  }

  const pattern = /refs\/heads\/([A-Za-z0-9/\-_.]*)/;
  const groups = currentRef.match(pattern);

  if (groups == null || groups.length !== 2) {
    throw new Error(`Failed to parse branch name from ${currentRef}`);
  }

  return groups[1];
};

const getBranchNameFriendly = (branchName) => {
  if (!branchName) {
    throw new Error('You have no branch for some reason');
  }

  const branchType = getBranchType(branchName);

  if (branchType === 'master' || branchType === 'dev') {
    return branchName.toLowerCase();
  }

  return branchName.replace(/\//g, '-').replace(/_/g, '-').toLowerCase();
};

const getBranchNameShort = (currentRef) => {
  if (!currentRef) {
    throw new Error('Can not return a branchname for null');
  }

  const pattern = /.*\/(.*)/;
  const groups = currentRef.match(pattern);

  if (currentRef === 'master' || currentRef === 'develop') {
    return currentRef;
  }
  if (groups == null || groups.length !== 2) {
    return currentRef;
  }

  return groups[1];
};

const getBranchNameSemver = (currentRef) => {
  if (!currentRef) {
    throw new Error(`Failed to parse branch name from ${currentRef}`);
  }

  const pattern = /[0-9a-zA-Z]+(?: [0-9a-zA-Z]+)*?/gm;
  const groups = currentRef.match(pattern);

  if (currentRef === 'master' || currentRef === 'develop') {
    return currentRef;
  }
  if (groups == null || groups.length < 1) {
    return currentRef;
  }
  let branchName = '';
  groups.forEach((group) => {
    branchName = branchName.concat(group);
  });
  branchName = branchName.replace('refsheads', '');
  return branchName;
};

const getShortSha = async (sha, shaSize = null) => {
  const args = [shaSize ? `--short=${shaSize}` : '--short', sha];
  return git.revparse(args);
};

const getTagAtCommit = async (sha) => git.tag(['--points-at', sha])
  .then((output) => output.trim());

const getComposedVersionString = (version, branchNameFriendly, buildNumber, shortSha) => {
  if (!branchNameFriendly) {
    throw Error('branchNameFriendly is null, undefined, or empty');
  }

  const branchType = getBranchType(branchNameFriendly);

  if (branchType === 'master') {
    return `${version}`;
  }

  if (branchType === 'dev') {
    return `${version}-dev-${buildNumber}-${shortSha}`;
  }

  return `${version}-${branchNameFriendly.toLowerCase()}-${shortSha}`;
};

module.exports = {
  getBranchName,
  isPreRelease,
  getBranchNameFriendly,
  getBranchNameShort,
  getBranchNameSemver,
  getShortSha,
  getComposedVersionString,
  getBranchType,
  getTagAtCommit,
};
