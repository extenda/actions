const { spawn } = require('child_process');
const core = require('@actions/core');
const { writeFileSync, mkdirSync } = require('fs');
const { run } = require('../../utils/src');

function generatePlaywrightConfig() {
  writeFileSync(
    './playwright.config.ts',
    `
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './health-check',
  testMatch: '*\.playwright\.js',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    video: 'on',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
`,
  );
}

function generateHealthCheck() {
  mkdirSync('./health-check', { recursive: true });
  writeFileSync(
    './health-check/index.playwright.js',
    `
const { test, expect: Expect } = require("@playwright/test");
const { parse } = require("yaml");
const { readFileSync } = require("fs");

const PASSWORD = process.env.PASSWORD;
const USER = process.env.USERNAME;
const TEST_TENANT = process.env.TENANT;

export async function login(page, url) {
  await page.goto(
    \`https://\${TEST_TENANT}.hiiretail.com/login?returnUrl=\${url}\`
  );
  await page.getByTestId("emailInput").click();
  await page.getByTestId("emailInput").fill(USER);

  await page.getByTestId("passwordInput").click();
  await page.getByTestId("passwordInput").fill(PASSWORD);

  await page.getByTestId("login-btn").click();
}

function main() {
  const config = parse(readFileSync(process.env.CONFIG_PATH, "utf8"));

  for (const { name, setup, expect } of config.cases) {
    test(name, async ({ page }) => {
      if (setup?.requireLogin) {
        await login(page, setup.url);
      } else {
        await page.goto(setup.url);
      }

      const element = await page.waitForSelector(expect?.element);
      const elementText = await element.textContent();

      if (expect?.includes) {
        await Expect(elementText?.includes(expect?.includes)).toBeTruthy();
      }

      if (expect?.toHaveText) {
        await Expect(elementText?.trim()).toEqual(expect?.toHaveText);
      }

      if (expect?.to === "be-visible" || expect?.to === "exist") {
        await Expect(page.locator(expect?.element)).toBeVisible();
      }

      if (expect?.to === "not-be-visible" || expect?.to === "not-exist") {
        await Expect(page.locator(expect?.element)).not.toBeVisible();
      }
    });
  }
}

main();
    `,
  );
}

async function action() {
  // const configPath = core.getInput('config-path', { required: true });
  // const username = core.getInput('username', { required: true });
  // const password = core.getInput('password', { required: true });
  // const tenant = core.getInput('tenant', { required: true });

  const password = 'uu4beOUlzOrBpdM)';
  const username = 'TEST_UI_HEALTH_CHEKS@extendaretail.com';
  const tenant = 'testrunner';
  const configPath = 'hehe.yml';

  generatePlaywrightConfig();
  generateHealthCheck();

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
