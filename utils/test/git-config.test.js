const fs = require('fs');
const gitConfig = require('../src/git-config');
const simpleGit = require('simple-git');
const path = require('path');

beforeAll(() => {
  fs.cpSync('.git/config', '.git/config.backup');
});

afterAll(() => {
  fs.rmSync('.git/config');
  fs.renameSync('.git/config.backup', '.git/config');
});

test('It can setup git', async () => {
  await gitConfig();
  const configFile = fs.readFileSync('.git/config', 'utf8');
  expect(configFile).toContain(
    '[user]\n\temail = devops@extendaretail.com\n\tname = GitHub Actions',
  );
  expect(configFile).toContain(
    '[http "https://github.com/"]\n\textraheader = AUTHORIZATION: basic',
  );
});

test('It can clear action/v6 credentials reference', async () => {
  const git = simpleGit();
  let gitDir = path.join(process.cwd(), '.git');
  gitDir = gitDir.replace(/\\/g, '/');
  await git.addConfig(
    `includeIf.gitdir:${gitDir}.path`,
    'test/path/to/credentials',
    false,
    'local',
  );

  let configFile = fs.readFileSync('.git/config', 'utf8');
  expect(configFile).toContain(
    `[includeIf "gitdir:${gitDir}"]\n\tpath = test/path/to/credentials`,
  );

  await gitConfig();
  configFile = fs.readFileSync('.git/config', 'utf8');
  expect(configFile).not.toContain(`[includeIf "gitdir:${gitDir}"`);
  expect(configFile).toContain(
    '[http "https://github.com/"]\n\textraheader = AUTHORIZATION: basic',
  );
});
