import { test, expect } from "@playwright/test";

test("login page renders", async ({ page }) => {
  const res = await page.goto("/login");
  expect(res?.status()).toBeLessThan(400);

  await expect(page.locator("body")).toBeVisible();

  const hasEmailField = await page.locator('input[type="email"]').count();
  const hasPasswordField = await page.locator('input[type="password"]').count();
  expect(hasEmailField + hasPasswordField).toBeGreaterThan(0);
});
