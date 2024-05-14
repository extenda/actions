const { test, expect: Expect } = require("@playwright/test");
const { parse } = require("yaml");
const { readFileSync } = require("fs");

const PASSWORD = process.env.PASSWORD;
const USER = process.env.USERNAME;
const TEST_TENANT = process.env.TENANT;

export async function login(page, url) {
  await page.goto(
    `https://${TEST_TENANT}.hiiretail.com/login?returnUrl=${url}`
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
