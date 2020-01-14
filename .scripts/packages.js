const exec = require('@actions/exec');
const path = require('path');
const fs = require('fs');

const basedir = path.resolve(__dirname, '../');

const createCommand = (arg) => {
  if (arg.startsWith('install:')) {
    const args = JSON.parse(arg.replace('install:', '')).original.join(' ');
    return args === 'ci' ? 'npm ci' : 'npm install --no-bin-links';
  }
  return arg;
};

const commandLine = createCommand(process.argv[2]);

const processPackage = async (dir) => {
  let output = `@ ${dir}\n> ${commandLine}\n`;
  return exec.exec(commandLine, '', {
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
    // eslint-disable-next-line no-console
    console.log(`Failed to process ${dir}`, err);
    process.exitCode = 1;
  }).finally(() => {
    // eslint-disable-next-line no-console
    console.log(output.trim(), '\n');
  });
};

// eslint-disable-next-line no-console
console.log(`Process modules in ${basedir}`);

// eslint-disable-next-line no-console
console.time('Process modules');
Promise.all(
  fs.readdirSync(basedir)
    .map((file) => path.join(basedir, file))
    .filter((file) => fs.lstatSync(file).isDirectory())
    .filter((dir) => fs.existsSync(path.join(dir, 'package.json')))
    .map(processPackage),
).then(() => {
  // eslint-disable-next-line no-console
  console.timeLog('Process modules');
});
