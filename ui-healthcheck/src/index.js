const { spawn } = require("child_process");
const core = require("@actions/core");
const { writeFileSync, mkdirSync } = require("fs");
const { run } = require("../../utils/src");

function generatePackageJson() {
  writeFileSync(
    "package.json",
    `
{
  "name": "health-checks",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {},
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/node": "^20.10.0"
  },
  "dependencies": {
    "@actions/core": "^1.10.0",
    "yaml": "^2.3.4"
  }
}
  `
  );
}

function generatePlaywrightConfig() {
  writeFileSync(
    "./playwright.config.ts",
    `
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './health-check',
  testMatch: '*\.playwright\.js',
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 3,
  reporter: 'html',
  timeout: 5 * 60 * 1000,
  use: {
    video: 'on',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
`
  );
}

function generateHealthCheck() {
  mkdirSync("./health-check", { recursive: true });
  writeFileSync(
    "./health-check/index.playwright.js",
    `
const { test, expect: Expect } = require("@playwright/test");
const { parse } = require("yaml");
const { readFileSync } = require("fs");

const PASSWORD = process.env.PASSWORD;
const USER = process.env.USERNAME;

export async function login(page, url, tenant) {
  const tenantFromUrl = url.replace('https://', '').split('.').at(0);
  const properUrl = tenant ? url.replace('{tenant}', tenant) : url;

  await page.goto(
    \`https://${
      tenant ?? tenantFromUrl
    }.hiiretail.com/login?returnUrl=${properUrl}\`
  );
  await page.getByTestId('emailInput').click();
  await page.getByTestId('emailInput').fill(USER);

  await page.getByTestId('passwordInput').click();
  await page.getByTestId('passwordInput').fill(PASSWORD);

  await page.getByTestId('login-btn').click();
}

function main() {
  const config = parse(readFileSync(process.env.CONFIG_PATH, 'utf8'));

  for (const { name, setup, expect, matrix } of config.cases) {
    if (matrix && matrix.tenant) {
      for (const tenant of matrix.tenant) {
        test(name, async ({ page }) => {
          if (setup?.requireLogin) {
            await login(page, setup.url, tenant);
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

          if (expect?.to === 'be-visible' || expect?.to === 'exist') {
            await Expect(page.locator(expect?.element)).toBeVisible();
          }

          if (expect?.to === 'not-be-visible' || expect?.to === 'not-exist') {
            await Expect(page.locator(expect?.element)).not.toBeVisible();
          }
        });
      }
      
      continue;
    }

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

      if (expect?.to === 'be-visible' || expect?.to === 'exist') {
        await Expect(page.locator(expect?.element)).toBeVisible();
      }

      if (expect?.to === 'not-be-visible' || expect?.to === 'not-exist') {
        await Expect(page.locator(expect?.element)).not.toBeVisible();
      }
    });
  }
}

main();
    `
  );
}

async function action() {
  const configPath = core.getInput("config-path", { required: true });
  const username = core.getInput("username", { required: false });
  const password = core.getInput("password", { required: false });

  generatePackageJson();
  generatePlaywrightConfig();
  generateHealthCheck();

  const npmInstall = spawn("npm", ["install"]);

  npmInstall.stdout.on("data", (data) => {
    core.info(`stdout: ${data}`);
  });

  npmInstall.stderr.on("data", (data) => {
    core.error(`stderr: ${data}`);
  });

  npmInstall.on("close", (npmCode) => {
    if (npmCode !== 0) {
      core.error(`npm install process exited with code ${npmCode}`);
      process.exit(npmCode);
    } else {
      const install = spawn("npx", ["playwright", "install"]);
      let isError = false;

      install.on("close", (code) => {
        if (code !== 0) {
          core.error(`playwright install process exited with code ${code}`);
          process.exit(code);
        } else {
          const test = spawn(
            "npx",
            ["playwright", "test", "--reporter", "github"],
            {
              env: {
                USERNAME: username,
                PASSWORD: password,
                CONFIG_PATH: configPath,
                ...process.env,
              },
            }
          );

          test.stdout.on("data", (data) => {
            isError = /error/gi.test(data.toString());
            core.info(`stdout: ${data}`);
          });

          test.stderr.on("data", (data) => {
            isError = /error/gi.test(data.toString());
            core.error(`stderr: ${data}`);
          });

          test.on("close", (testCode) => {
            if (testCode !== 0 || isError) {
              core.error(
                `playwright test process exited with code ${
                  testCode < 0 ? 1 : testCode
                }`
              );
              process.exit(testCode < 0 ? 1 : testCode);
            } else {
              core.info("All good!");
            }
          });
        }
      });
    }
  });
}

if (require.main === module) {
  run(action);
}

module.exports = action;