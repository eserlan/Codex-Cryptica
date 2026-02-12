import { test, expect } from "@playwright/test";

test.describe.skip("Guest Mode", () => {
  test.beforeEach(async ({ page }) => {
    // Mock PeerJS networking to keep this test reliable in CI/headless runs
    // Intercept requests to the default PeerJS cloud server or local peer server
    await page.route("**/peerjs/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ type: "OPEN" }), // Minimal mock response
      });
    });
  });

  test("should enter guest mode and then exit correctly", async ({ page }) => {
    // Navigate with a shareId to trigger guest mode
    await page.goto("/?shareId=p2p-test-id");
    await page.waitForLoadState("networkidle");

    // 1. Verify Guest Login Modal appears
    // The h2 contains "Shared Campaign"
    const modalHeader = page.getByRole("heading", { name: "Shared Campaign" });
    await expect(modalHeader).toBeVisible({ timeout: 10000 });

    // 2. Join as guest
    await page.fill('input[placeholder="Enter Username..."]', "TestGuest");
    await page.click('button:has-text("ACCESS ARCHIVE")');

    // Wait for the modal to disappear
    await expect(modalHeader).not.toBeVisible();

    // 3. Verify EXIT GUEST MODE button is visible
    const exitButton = page.getByRole("button", { name: "EXIT GUEST MODE" });
    await expect(exitButton).toBeVisible();

    // 4. Click EXIT GUEST MODE
    await exitButton.click();

    // 5. Verify we are back to "OPEN VAULT" state
    await expect(page).not.toHaveURL(/shareId=/);

    const openVaultButton = page.getByRole("button", { name: "OPEN VAULT" });
    await expect(openVaultButton).toBeVisible();
  });

  test("should show exit guest mode button in mobile menu", async ({
    page,
  }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/?shareId=p2p-test-id");
    await page.waitForLoadState("networkidle");

    // Verify modal
    const modalHeader = page.getByRole("heading", { name: "Shared Campaign" });
    await expect(modalHeader).toBeVisible();

    // Join as guest
    await page.fill('input[placeholder="Enter Username..."]', "MobileGuest");
    await page.click('button:has-text("ACCESS ARCHIVE")');
    await expect(modalHeader).not.toBeVisible();

    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');

    // Verify EXIT GUEST MODE button is visible in the drawer
    const exitButton = page.getByRole("button", { name: "EXIT GUEST MODE" });
    await expect(exitButton).toBeVisible();

    // Click it
    await exitButton.click();

    // Verify exit worked
    await expect(page).not.toHaveURL(/shareId=/);
    await expect(
      page.getByRole("button", { name: "OPEN VAULT" }),
    ).toBeVisible();
  });
});
