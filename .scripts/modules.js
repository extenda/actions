const exec = require('@actions/exec');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const basedir = path.resolve(__dirname, '../');

/* eslint-disable no-console */

const execModule = async (dir, command) => {
  const module = path.relative(basedir, dir);
  let output = chalk.blue(`> ${command}\n`);
  process.env.FORCE_COLOR = 'true';
  return exec.exec(command, '', {
    cwd: dir,
    silent: true,
    listeners: {
      stdout: (data) => {
        output += data.toString();
      },
      stderr: (data) => {
        output += data.toString();
      },
    },
  }).catch((err) => {
    console.log(chalk.white.bgRed(`FAILED ${dir}`), err.message);
    process.exitCode = 1;
  }).finally(() => {
    console.group(`${chalk.green(`actions/${module}`)}`);
    console.log(output.trim(), '\n');
    console.groupEnd();
  });
};

const findModules = () => fs.readdirSync(basedir)
  .map((file) => path.join(basedir, file))
  .filter((file) => fs.lstatSync(file).isDirectory())
  .filter((dir) => fs.existsSync(path.join(dir, 'package.json')));

const eachModules = (fn) => findModules().forEach(fn);

const execModules = async (command) => Promise.all(
  findModules().map((dir) => execModule(dir, command)),
);

/* eslint-enable no-console */

module.exports = {
  npmArgument: JSON.parse(process.argv[2]).original.join(' '),
  modules: {
    each: eachModules,
    exec: execModules,
  },
};
