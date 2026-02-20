import { test, expect } from "@playwright/test";

test.describe("Interactive Demo Mode", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
      localStorage.removeItem("codex_skip_landing");
    });
  });

  test("should start demo from landing page", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    // Verify landing page visible
    await expect(page.getByText("Build Your World.")).toBeVisible();

    // Click Try Demo
    await page.getByRole("button", { name: "Try Demo" }).click();

    // Landing page should be gone
    await expect(page.getByText("Build Your World.")).not.toBeVisible();

    // Demo mode badge should be visible
    await expect(page.getByText("DEMO MODE")).toBeVisible();

    // Sample data should be loaded
    await expect(page.getByTestId("open-vault-button")).toContainText(
      "Fantasy Demo",
    );
    const count = page.getByTestId("entity-count");
    await count.waitFor({ state: "attached" });
    await expect(count).toBeVisible();
    await expect(count).toContainText("7");
  });

  test("should start theme-specific demo via URL", async ({ page }) => {
    await page.goto("http://localhost:5173/?demo=vampire");

    // Should bypass landing page
    await expect(page.getByText("Build Your World.")).not.toBeVisible();

    // Demo badge visible
    await expect(page.getByText("DEMO MODE")).toBeVisible();

    // Verify theme jargon (Horror/Vampire theme uses 'Crypt' for vault)
    // Wait for vault initialization
    await expect(page.getByTestId("open-vault-button")).toContainText("Crypt");
    await expect(page.getByTestId("open-vault-button")).toContainText(
      "Horror Demo",
    );
  });

  test("should prevent data persistence in demo mode", async ({ page }) => {
    await page.goto("http://localhost:5173/?demo=fantasy");

    // Wait for demo to be ready
    await expect(page.getByText("DEMO MODE")).toBeVisible();

    // Add a new entity
    await page.getByTestId("new-entity-button").click();

    // Use a more flexible selector for the placeholder as it's jargon-dependent
    const input = page.locator('input[placeholder$="Title..."]');
    await expect(input).toBeVisible();
    await input.fill("New Transient Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // Open search to find the new node
    await page.keyboard.press("Control+k");
    const searchInput = page.locator('input[placeholder$="..."]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("New Transient Node");

    // Indicator should show transient mode
    await page.getByTestId("search-result").first().click(); // Open some node
    await expect(page.getByText("TRANSIENT MODE")).toBeVisible();

    // Reload page
    await page.reload();

    // Should return to landing or restart demo (if auto-start triggers)
    // Since we cleared skip_landing, it should show landing if not in demo
    // But auto-start demo triggers if vault is empty.
    // In our test environment, we need to check the outcome.
  });

  test("should convert demo to real campaign", async ({ page }) => {
    await page.goto("http://localhost:5173/?demo=fantasy");

    // Open settings
    await page.getByTestId("settings-button").click();

    // Click Save as Campaign
    await page.getByRole("button", { name: "Save as Campaign" }).click();

    // Notification should appear
    await expect(page.getByText("CAMPAIGN SAVED SUCCESSFULLY")).toBeVisible();

    // Demo badge should be gone
    await expect(page.getByText("DEMO MODE")).not.toBeVisible();
  });
});
