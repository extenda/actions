import chalk from 'chalk';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const basedir = path.resolve(__dirname, '../');

const serial = (funcs) =>
  funcs.reduce(
    (promise, func) =>
      promise.then((result) =>
        func().then(Array.prototype.concat.bind(result)),
      ),
    Promise.resolve([]),
  );

const execCommand = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, [], {
      ...options,
      shell: true,
      env: { ...process.env, FORCE_COLOR: 'true' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', reject);

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Command failed with exit code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.code = code;
        reject(error);
      }
    });
  });
};

const execModule = async (dir, commands, exitOnError) => {
  const module = path.relative(basedir, dir);
  const execCommands =
    commands instanceof Function ? commands(module) : [commands];
  process.env.FORCE_COLOR = 'true';

  const executions = execCommands.map((command) => () => {
    let output = chalk.blue(`> ${command}\n`);
    return execCommand(command, { cwd: dir })
      .then(({ stdout, stderr }) => {
        output += stdout + stderr;
        return output;
      })
      .catch((err) => {
        output += err.stdout || '';
        output += err.stderr || '';
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

const findModules = () =>
  fs
    .readdirSync(basedir)
    .map((file) => path.join(basedir, file))
    .filter((file) => fs.lstatSync(file).isDirectory())
    .filter((dir) => fs.existsSync(path.join(dir, 'package.json')))
    .sort((a, b) => a.localeCompare(b));

const eachModules = (fn) => findModules().forEach(fn);

const execModules = async (commands, exitOnError = true) =>
  Promise.all(
    findModules().map((dir) => execModule(dir, commands, exitOnError)),
  );

export const npmArgument = JSON.parse(
  process.env.npm_config_argv || '{"original": []}',
).original.join(' ');

export const modules = {
  each: eachModules,
  exec: execModules,
  list: findModules,
};
