import { test as setup, expect } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

setup("autenticar", async ({ page }) => {
  await page.goto("/auth/login");
  await page.fill("input[type=email]", "admin@loja.com");
  await page.fill("input[type=password]", "123456");
  await page.click("button[type=submit]");
  await page.waitForURL("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
