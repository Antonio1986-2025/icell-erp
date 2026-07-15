import { test, expect } from "@playwright/test";

test.describe("Trade-in", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("listagem de trade-ins carrega", async ({ page }) => {
    await page.goto("/dashboard/estoque/trade-in");
    await expect(page.getByRole("heading", { name: "Trade-in" })).toBeVisible();
  });

  test("botao Novo Trade-in redireciona", async ({ page }) => {
    await page.goto("/dashboard/estoque/trade-in");
    await page.click("a:has-text('Novo Trade-in')");
    await expect(page).toHaveURL("/dashboard/estoque/trade-in/novo");
    await expect(page.getByRole("heading", { name: "Novo Trade-in" })).toBeVisible();
  });

  test("wizard novo trade-in exibe passo 1", async ({ page }) => {
    await page.goto("/dashboard/estoque/trade-in/novo");
    await expect(page.getByText("Cliente (vendedor)")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Aparelho" })).toBeVisible();
    await expect(page.getByText("Nome do Aparelho *")).toBeVisible();
  });

  test("criacao de trade-in basico", async ({ page }) => {
    await page.goto("/dashboard/estoque/trade-in/novo");

    const imeiUnico = `358247111${String(Date.now()).slice(-6)}`;

    await page.getByPlaceholder("000.000.000-00").fill("321.654.987-00");
    await page.locator("input[required]").first().fill("Carlos");
    await page.getByPlaceholder("iPhone 13 128GB Preto").fill("iPhone 13 128GB Preto");
    await page.getByPlaceholder("358247111222333").fill(imeiUnico);
    await page.waitForTimeout(2000);

    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForTimeout(300);

    await page.getByPlaceholder("2800").fill("2500");
    await page.getByRole("button", { name: "Salvar Trade-in" }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText("iPhone 13 128GB Preto").first()).toBeVisible();
  });
});
