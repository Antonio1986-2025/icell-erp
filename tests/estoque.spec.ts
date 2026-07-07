import { test, expect } from "@playwright/test";

test.describe("Estoque", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("listagem carrega com filtros", async ({ page }) => {
    await page.goto("/dashboard/estoque");
    await expect(page.getByRole("heading", { name: "Estoque" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Celulares" })).toBeVisible();
  });

  test("filtro por celulares funciona", async ({ page }) => {
    await page.goto("/dashboard/estoque");
    await page.getByRole("button", { name: "Celulares" }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: "Celulares" })).toHaveClass(/bg-blue-600/);
  });

  test("filtro por status funciona", async ({ page }) => {
    await page.goto("/dashboard/estoque");
    await page.selectOption("select", "EM_ESTOQUE");
    await page.waitForTimeout(500);
    const statusTag = page.locator("span").filter({ hasText: "Em Estoque" }).first();
    await expect(statusTag).toBeVisible();
  });
});
