const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');
const path = require('path');
const fs = require('fs');
const os = require('os');

const mavenHome = path.join(os.homedir(), '.m2');
const mavenSettings = path.join(mavenHome, 'settings.xml');

const run = async (args, workingDir = './') => {
  let executable = os.platform() === 'win32' ? './mvnw.cmd' : './mvnw';
  if (!fs.existsSync(executable)) {
    executable = 'mvn';
  }
  return exec.exec(`${executable} -B -V ${args}`, undefined, {
    cwd: workingDir,
  });
};

const setVersion = async (newVersion, workingDir = './') => {
  core.info(`Build version: ${newVersion}`);
  await run(
    `versions:set -DnewVersion=${newVersion} -DgenerateBackupPoms=false`,
    workingDir,
  );
};

const copySettings = async (hasExtensions) => {
  core.debug('Copy maven-settings.xml');
  await io.mkdirP(mavenHome);

  const settings = {
    extenda: path.join(
      __dirname,
      hasExtensions
        ? 'extenda-maven-gar-settings.xml'
        : 'extenda-maven-settings.xml',
    ),
    AbalonAb: path.join(__dirname, 'AbalonAb-maven-settings.xml'),
  };

  const [owner] = (process.env.GITHUB_REPOSITORY || 'extenda').split('/');
  const settingsFile = settings[owner] || settings.extenda;
  core.info(`Copy settings file ${settingsFile}`);
  await io.cp(settingsFile, mavenSettings, { force: true });
  return owner === 'extenda' && hasExtensions;
};

module.exports = {
  run,
  copySettings,
  setVersion,
};
