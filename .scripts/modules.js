const exec = require('@actions/exec');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const basedir = path.resolve(__dirname, '../');

const serial = (funcs) => funcs.reduce((promise, func) => promise.then((result) => func().then(
  Array.prototype.concat.bind(result),
)), Promise.resolve([]));

/* eslint-disable no-console */
const execModule = async (dir, commands, exitOnError) => {
  const module = path.relative(basedir, dir);
  const execCommands = commands instanceof Function ? commands(module) : [commands];
  process.env.FORCE_COLOR = 'true';

  const executions = execCommands.map((command) => () => {
    let output = chalk.blue(`> ${command}\n`);
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
    }).then(() => output)
      .catch((err) => {
        output += `${chalk.white.bgRed(`FAILED ${dir}`)} ${err.message}`;
        if (exitOnError) {
          process.exitCode = 1;
        }
        return output;
      });
  });

  await serial(executions).then((outputs) => {
    console.group(`${chalk.green(`actions/${module}`)}`);
    console.log(outputs.join('\n').trim(), '\n');
    console.groupEnd();

    // Fail fast if a task has failed.
    if (process.exitCode === 1) {
      process.exit();
    }
  });
};

const findModules = () => fs.readdirSync(basedir)
  .map((file) => path.join(basedir, file))
  .filter((file) => fs.lstatSync(file).isDirectory())
  .filter((dir) => fs.existsSync(path.join(dir, 'package.json')))
  .sort((a, b) => a.localeCompare(b));

const eachModules = (fn) => findModules().forEach(fn);

const execModules = async (commands, exitOnError=true) => Promise.all(
  findModules().map((dir) => execModule(dir, commands, exitOnError)),
);

/* eslint-enable no-console */

module.exports = {
  npmArgument: JSON.parse(process.env.npm_config_argv || '{"original": []}').original.join(' '),
  modules: {
    each: eachModules,
    exec: execModules,
    list: findModules,
  },
};
