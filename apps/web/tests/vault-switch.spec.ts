import { test, expect } from "@playwright/test";

test.describe("Vault Switching and Detachment", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      // @ts-expect-error - Mock browser API
      window.showDirectoryPicker = async () => {
        return {
          kind: "directory",
          name: "test-vault",
          requestPermission: async () => "granted",
          queryPermission: async () => "granted",
          values: () => [],
          getDirectoryHandle: async () => ({
            kind: "directory",
            name: "images",
            getFileHandle: async () => ({
              kind: "file",
              createWritable: async () => ({
                write: async () => {},
                close: async () => {}
              })
            })
          }),
          getFileHandle: async () => ({
            kind: "file",
            name: "test.md",
            getFile: async () => new File([""], "test.md"),
          }),
        };
      };
    });

    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase("CodexCryptica");
    });
    await page.reload();
  });

  test("should detach and clear active vault", async ({ page }) => {
    // 1. Open a vault
    await page.getByRole("button", { name: "OPEN VAULT" }).click();
    
    // Wait for vault to load (mocked)
    await expect(page.locator('[data-testid="open-vault-button"]')).not.toBeVisible();
    
    // 2. Close the vault
    await page.getByRole("button", { name: "CLOSE" }).click();
    
    // 3. Verify state is cleared
    await expect(page.getByRole("button", { name: "OPEN VAULT" })).toBeVisible();
    await expect(page.getByText("NO VAULT")).toBeVisible();
    
    // 4. Verify persistence is cleared by reloading
    await page.reload();
    await expect(page.getByRole("button", { name: "OPEN VAULT" })).toBeVisible();
    await expect(page.getByText("NO VAULT")).toBeVisible();
  });

  test("should allow mounting a different campaign after detaching", async ({ page }) => {
    // 1. Open Vault A
    await page.getByRole("button", { name: "OPEN VAULT" }).click();
    await expect(page.getByRole("button", { name: "CLOSE" })).toBeVisible();
    
    // 2. Detach Vault A
    await page.getByRole("button", { name: "CLOSE" }).click();
    
    // 3. Open Vault B (mocked same way, but verifying flow)
    await page.getByRole("button", { name: "OPEN VAULT" }).click();
    await expect(page.getByRole("button", { name: "CLOSE" })).toBeVisible();
  });
});
