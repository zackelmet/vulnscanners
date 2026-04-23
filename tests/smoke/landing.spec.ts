import { test, expect } from "@playwright/test";

test("landing page renders with hero copy", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(400);

  await expect(page).toHaveTitle(/vulnscanners/i);

  const body = page.locator("body");
  await expect(body).toContainText(/nmap/i);
  await expect(body).toContainText(/nuclei/i);
  await expect(body).toContainText(/zap/i);
});
