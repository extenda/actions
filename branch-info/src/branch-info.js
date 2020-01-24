const isPreRelease = (branchName) => branchName !== 'master';

const getBranchName = (currentRef) => {
  if (!currentRef) {
    return null;
  }

  const pattern = /refs\/heads\/([A-Za-z0-9/\-_]*)/;
  const groups = currentRef.match(pattern);

  if (groups == null || groups.length !== 2) {
    return null;
  }

  return groups[1];
};

const getSuffix = (branchName) => {
  if (!branchName || branchName === 'master') {
    return '';
  }

  return branchName.replace(/\//g, '-').replace(/_/g, '-');
};

module.exports = {
  getBranchName,
  isPreRelease,
  getSuffix,
};
