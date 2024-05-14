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
      console.error(`playwright install process exited with code ${code}`);
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
        console.log(`stdout: ${data}`);
      });

      test.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      test.on('close', (code) => {
        if (code !== 0) {
          console.error(`playwright test process exited with code ${code}`);
          process.exit(code);
        } else {
          console.log('All good!');
        }
      });
    }
  });
}

if (require.main === module) {
  run(action);
}

module.exports = action;
