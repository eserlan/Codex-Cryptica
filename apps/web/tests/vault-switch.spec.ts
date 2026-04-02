import { test, expect } from "@playwright/test";

test.describe("Vault Switching", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });
    // Add page error listener
    page.on("pageerror", (err) => console.log(`PAGE ERROR: ${err.message}`));
    page.on("console", (msg) => console.log(`PAGE LOG: ${msg.text()}`));

    await page.goto("/");
    // Wait for vault initialization (OPFS auto-load)
    await page.waitForFunction(
      () => {
        const status = (window as any).vault?.status;
        return status === "idle";
      },
      {
        timeout: 15000,
      },
    );
    // Wait for graph
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should display current vault name in header", async ({ page }) => {
    await expect(page.getByTestId("open-vault-button")).toBeVisible();
    await expect(page.getByTestId("open-vault-button")).toContainText(
      /Default Vault|Local Vault/,
    );
  });

  test("should open vault switcher modal", async ({ page }) => {
    await page.getByTestId("open-vault-button").click();
    await expect(page.getByText("VAULT SELECTOR")).toBeVisible();
    const modal = page.getByTestId("vault-switcher-modal");
    const defaultVaultRow = modal
      .getByRole("button", { name: /Default Vault|Local Vault/ })
      .first();
    await expect(defaultVaultRow).toBeVisible();
    await expect(defaultVaultRow).toContainText("ACTIVE");
  });

  test("should create and switch to a new vault", async ({ page }) => {
    await page.getByTestId("open-vault-button").click();
    await page.getByRole("button", { name: "NEW VAULT" }).click();

    await page.getByPlaceholder("Vault Name...").fill("Test Vault");
    await page.getByRole("button", { name: "CREATE" }).click();

    await expect(page.getByTestId("open-vault-button")).toContainText(
      "Test Vault",
    );

    await page.getByTestId("open-vault-button").click();
    const modal = page.getByTestId("vault-switcher-modal");
    const newVaultRow = modal
      .getByRole("button", { name: "Test Vault" })
      .first();
    await expect(newVaultRow).toBeVisible();
    await expect(newVaultRow).toContainText("ACTIVE");
  });

  test("should isolate data when switching vaults", async ({ page }) => {
    // 1. In Default Vault, create Alpha Entity
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("character", "Alpha Hero");
    });

    // Wait for entity to exist in store
    await expect(page.getByTestId("entity-count")).toContainText("1");

    // 2. Create and switch to 'Vault Beta'
    await page.getByTestId("open-vault-button").click();
    await page.getByRole("button", { name: "NEW VAULT" }).click();
    await page.getByPlaceholder("Vault Name...").fill("Vault Beta");
    await page.getByRole("button", { name: "CREATE" }).click();

    await page.waitForFunction(() => (window as any).vault.status === "idle");
    await expect(page.getByTestId("open-vault-button")).toContainText(
      "Vault Beta",
    );

    // 3. Verify Alpha Hero is NOT visible in Vault Beta (Check store)
    const hasAlphaInBeta = await page.evaluate(() => {
      return (window as any).vault.allEntities.some((e: any) =>
        e.title.includes("Alpha"),
      );
    });
    expect(hasAlphaInBeta).toBe(false);

    // 4. Create Beta Entity
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("character", "Beta Villain");
    });
    await expect(page.getByTestId("entity-count")).toContainText("1");

    // 5. Switch back to Default Vault
    await page.getByTestId("open-vault-button").click();
    const switcher = page.getByTestId("vault-switcher-modal");
    await expect(switcher).toBeVisible();

    const defaultRow = switcher
      .getByRole("button", { name: /Default Vault|Local Vault/ })
      .first();
    await defaultRow.click({ force: true });

    // Close modal via Escape instead of potentially-hidden DONE button
    await page.keyboard.press("Escape");
    await expect(switcher).not.toBeVisible();

    await page.waitForFunction(() => (window as any).vault.status === "idle");
    await expect(page.getByTestId("open-vault-button")).toContainText(
      /Default Vault|Local Vault/,
    );

    // 6. Verify Alpha Hero IS visible, Beta Villain is NOT
    const hasAlphaInDefault = await page.evaluate(() => {
      return (window as any).vault.allEntities.some((e: any) =>
        e.title.includes("Alpha Hero"),
      );
    });
    expect(hasAlphaInDefault).toBe(true);

    const hasBetaInDefault = await page.evaluate(() => {
      return (window as any).vault.allEntities.some((e: any) =>
        e.title.includes("Beta"),
      );
    });
    expect(hasBetaInDefault).toBe(false);
  });
});
