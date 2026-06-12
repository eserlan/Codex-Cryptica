import { test, expect } from "@playwright/test";

test.describe("Campaign-Specific Theme Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });

    if (process.env.PW_DEBUG_CONSOLE === "1") {
      page.on("console", (msg) => {
        console.log(`[PAGE] ${msg.type()}: ${msg.text()}`);
      });
    }

    await page.goto("/");
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
    await page.getByRole("tab", { name: "Theme" }).click();
    await page.getByRole("button", { name: "Neon Night" }).click();
    await page.getByLabel("Close Settings").click();

    // Verify Vault A theme (cyberpunk in light mode = "Vapor Dawn" with #be185d)
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#be185d",
    );

    // 3. Create/Switch to Vault B
    const vaultBId = await page.evaluate(async () => {
      const id = await (window as any).vault.createVault("Campaign B");
      await (window as any).themeStore.loadForVault(id);
      return id;
    });
    await page.waitForFunction(() => (window as any).vault.status === "idle");

    // Verify Vault B starts with default theme (Workspace Light)
    // Workspace primary is #57534e
    await expect
      .poll(
        async () => {
          return await page.evaluate(
            () => (window as any).themeStore.currentThemeId,
          );
        },
        { timeout: 10000 },
      )
      .toBe("workspace");

    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#57534e",
    );

    // 4. Set Theme to "Blood & Noir" (Horror) for Vault B
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Theme" }).click();
    await page.getByRole("button", { name: "Blood & Noir" }).click();
    await page.getByLabel("Close Settings").click();

    // Verify Vault B theme (horror in light mode = "Autopsy Report" with #7f1d1d)
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#7f1d1d",
    );

    // 5. Switch back to Vault A
    await page.evaluate(async (id) => {
      await (window as any).vault.switchVault(id);
    }, vaultAId);
    await page.waitForFunction(() => (window as any).vault.status === "idle");

    // 6. Verify Vault A theme is restored to "Neon Night" (cyberpunk, light mode = #be185d)
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#be185d",
    );

    // 7. Switch back to Vault B
    await page.evaluate(async (id) => {
      await (window as any).vault.switchVault(id);
    }, vaultBId);
    await page.waitForFunction(() => (window as any).vault.status === "idle");

    // 8. Verify Vault B theme is restored to "Blood & Noir" (horror, light mode = #7f1d1d)
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#7f1d1d",
    );
  });
});
