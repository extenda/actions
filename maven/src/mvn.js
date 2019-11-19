const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');
const path = require('path');
const os = require('os');

const SETTINGS_FILE = path.join(__dirname, 'maven-settings.xml');
const mavenHome = path.join(os.homedir(), '.m2');
const mavenSettings = path.join(mavenHome, 'maven-settings.xml');

const run = async (args) =>
  exec.exec(`mvn -B -V --settings=${mavenSettings} ${args}`);

const setVersion = async (newVersion) => {
  core.info(`Build version: ${newVersion}`);
  await run(`versions:set -DnewVersion=${newVersion} -DgenerateBackupPoms=false`);
};

const copySettings = async () => {
  core.debug('Copy maven-settings.xml');
  await io.mkdirP(mavenHome);
  await io.cp(SETTINGS_FILE, mavenSettings, { force: true });
};

module.exports = {
  run,
  copySettings,
  setVersion,
};
