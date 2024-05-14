const { spawn } = require('child_process');
const core = require('@actions/core');
const { run } = require('../../utils/src');

async function action() {
  const configPath = core.getInput('config-path', { required: true });
  const username = core.getInput('username', { required: true });
  const password = core.getInput('password', { required: true });
  const tenant = core.getInput('tenant', { required: true });

  const install = spawn('npx', ['playwright', 'install']);

  install.on('close', (code) => {
    if (code !== 0) {
      core.error(`playwright install process exited with code ${code}`);
      process.exit(code);
    } else {
      const test = spawn('npx', ['playwright', 'test', '--reporter', 'github'], {
        env: {
          TENANT: tenant,
          USERNAME: username,
          PASSWORD: password,
          CONFIG_PATH: configPath,
          ...process.env,
        },
      });

      test.stdout.on('data', (data) => {
        core.info(`stdout: ${data}`);
      });

      test.stderr.on('data', (data) => {
        core.error(`stderr: ${data}`);
      });

      test.on('close', (testCode) => {
        if (code !== 0) {
          core.error(`playwright test process exited with code ${testCode}`);
          process.exit(testCode);
        } else {
          core.info('All good!');
        }
      });
    }
  });
}

if (require.main === module) {
  run(action);
}

module.exports = action;
