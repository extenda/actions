import simpleGit from 'simple-git';

export const isPreRelease = (branchName) => branchName !== 'master';

export const getBranchType = (branchName) => {
  const devPattern = /(^dev$|^develop$)/gim;
  const masterPattern = /^master$/gim;

  if (devPattern.test(branchName)) {
    return 'dev';
  }

  if (masterPattern.test(branchName)) {
    return 'master';
  }

  return 'feature';
};

export const getBranchName = (currentRef) => {
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

export const getBranchNameFriendly = (branchName) => {
  if (!branchName) {
    throw new Error('You have no branch for some reason');
  }

  const branchType = getBranchType(branchName);

  if (branchType === 'master' || branchType === 'dev') {
    return branchName.toLowerCase();
  }

  return branchName.replace(/\//g, '-').replace(/_/g, '-').toLowerCase();
};

export const getBranchNameShort = (currentRef) => {
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

export const getBranchNameSemver = (currentRef) => {
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

export const getShortSha = async (sha, shaSize = null) => {
  const args = [shaSize ? `--short=${shaSize}` : '--short', sha];
  return simpleGit().revparse(args);
};

export const getTagAtCommit = async (sha) =>
  simpleGit()
    .tag(['--points-at', sha])
    .then((output) => output.trim());

export const getComposedVersionString = (
  version,
  branchNameFriendly,
  buildNumber,
  shortSha,
) => {
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
