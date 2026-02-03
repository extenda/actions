import path from 'path';
import simpleGit from 'simple-git';

const basicAuth = () => {
  const buffer = Buffer.from(
    `github-actions:${process.env.GITHUB_TOKEN}`,
    'utf8',
  );
  const credentials = buffer.toString('base64');
  return `basic ${credentials}`;
};

/**
 * Remove reference to credentials persisted by actions/checkout@v6.
 * This is necessary to not set the authorization header twice.
 * @param git the simple-git instance
 * @return {Promise<void>}
 */
const removeExistingGitCredentials = async (git) => {
  // normalize to forward slashes for Git config keys
  let gitDir = path.join(process.cwd(), '.git');
  gitDir = gitDir.replace(/\\/g, '/');

  await git.raw(
    'config',
    '--local',
    '--unset',
    `includeIf.gitdir:${gitDir}.path`,
  );
};

/**
 * Configure the local Git instance to allow push operations against the origin.
 */
/* istanbul ignore next */
const gitConfig = async () => {
  const git = simpleGit();

  await removeExistingGitCredentials(git);

  await git.addConfig('user.email', 'devops@extendaretail.com');
  await git.addConfig('user.name', 'GitHub Actions');

  await git.addConfig(
    'http.https://github.com/.extraheader',
    `AUTHORIZATION: ${basicAuth()}`,
  );
};

export default gitConfig;
