const exec = require('@actions/exec');

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

  const pattern = /refs\/heads\/([A-Za-z0-9/\-_]*)/;
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

const getShortSha = async (sha, shaSize = null) => {
  const args = ['rev-parse'];

  if (shaSize) {
    args.push(`--short=${shaSize}`);
  } else {
    args.push('--short');
  }

  let execOutput = '';
  const options = {};
  options.listeners = {
    stdout: (data) => {
      execOutput += data.toString();
    },
  };

  args.push(sha);
  await exec.exec('git', args, options);
  return execOutput.trimRight();
};

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
  getShortSha,
  getComposedVersionString,
  getBranchType,
};
