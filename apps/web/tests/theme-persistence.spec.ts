import { test, expect } from "@playwright/test";

test.describe("Campaign-Specific Theme Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });
    await page.goto("http://localhost:5173/");
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() => (window as any).vault?.isInitialized);
  });

  test("Theme persists individually for each campaign", async ({ page }) => {
    // 1. Create/Switch to Vault A
    const vaultAId = await page.evaluate(async () => {
      return await (window as any).vault.createVault("Campaign A");
    });
    await page.waitForFunction(() => (window as any).vault.status === "idle");

    // 2. Set Theme to "Neon Night" (Cyberpunk) for Vault A
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Aesthetics" }).click();
    await page.getByRole("button", { name: "Neon Night" }).click();
    await page.getByLabel("Close Settings").click();

    // Verify Vault A theme
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#f472b6",
    );

    // 3. Create/Switch to Vault B
    const vaultBId = await page.evaluate(async () => {
      return await (window as any).vault.createVault("Campaign B");
    });
    await page.waitForFunction(() => (window as any).vault.status === "idle");

    // Verify Vault B starts with default theme (Ancient Parchment)
    // Fantasy primary is #78350f -> rgb(120, 53, 15)
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#78350f",
    );

    // 4. Set Theme to "Blood & Noir" (Horror) for Vault B
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Aesthetics" }).click();
    await page.getByRole("button", { name: "Blood & Noir" }).click();
    await page.getByLabel("Close Settings").click();

    // Verify Vault B theme
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#dc2626",
    );

    // 5. Switch back to Vault A
    await page.evaluate(async (id) => {
      await (window as any).vault.switchVault(id);
    }, vaultAId);
    await page.waitForFunction(() => (window as any).vault.status === "idle");

    // 6. Verify Vault A theme is restored to "Neon Night"
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#f472b6",
    );

    // 7. Switch back to Vault B
    await page.evaluate(async (id) => {
      await (window as any).vault.switchVault(id);
    }, vaultBId);
    await page.waitForFunction(() => (window as any).vault.status === "idle");

    // 8. Verify Vault B theme is restored to "Blood & Noir"
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#dc2626",
    );
  });
});
