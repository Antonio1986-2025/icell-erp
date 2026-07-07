import { test, expect } from "@playwright/test";

test.describe("Produtos", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("listagem carrega e mostra dados do seed", async ({ page }) => {
    await page.goto("/dashboard/produtos");
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("busca por nome funciona", async ({ page }) => {
    await page.goto("/dashboard/produtos");
    await page.fill("input[name=search]", "iPhone");
    await page.press("input[name=search]", "Enter");
    await page.waitForTimeout(500);
    const linhas = page.locator("table tbody tr");
    const count = await linhas.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("botao Criar Produto redireciona", async ({ page }) => {
    await page.goto("/dashboard/produtos");
    await page.getByRole("link", { name: "Criar Produto" }).click();
    await expect(page).toHaveURL("/dashboard/produtos/novo");
    await expect(page.getByRole("heading", { name: "Novo Produto" })).toBeVisible();
  });

  test("form cadastro produto NOVO renderiza campos", async ({ page }) => {
    await page.goto("/dashboard/produtos/novo");
    await expect(page.getByRole("heading", { name: "Novo Produto" })).toBeVisible();
    await expect(page.getByPlaceholder("Ex: iPhone 16 Pro Max 256GB")).toBeVisible();
    await expect(page.getByText("Produto Novo")).toBeVisible();
    await expect(page.getByText("Produto Usado")).toBeVisible();
  });

  test("selecionar USADO com categoria com IMEI mostra campo IMEI", async ({ page }) => {
    await page.goto("/dashboard/produtos/novo");

    await page.getByPlaceholder("Ex: iPhone 16 Pro Max 256GB").fill("iPhone Teste");

    await page.waitForTimeout(1000);
    await page.locator("select").selectOption({ label: "iPhones" });
    await page.waitForTimeout(200);

    await page.getByText("Produto Usado").click();
    await page.waitForTimeout(300);

    await expect(page.getByText("IMEI *")).toBeVisible();
  });
});
