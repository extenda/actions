const simpleGit = require('simple-git');

const basicAuth = () => {
  const buffer = Buffer.from(`github-actions:${process.env.GITHUB_TOKEN}`, 'utf8');
  const credentials = buffer.toString('base64');
  return `basic ${credentials}`;
};

/**
 * Configure the local Git instance to allow push operations against the origin.
 */
const gitConfig = async () => {
  const git = simpleGit();

  await git.addConfig('user.email', 'devops@extendaretail.com');
  await git.addConfig('user.name', 'GitHub Actions');
  await git.addConfig(
    'http.https://github.com/.extraheader',
    `AUTHORIZATION: ${basicAuth()}`,
  );
};

module.exports = gitConfig;
