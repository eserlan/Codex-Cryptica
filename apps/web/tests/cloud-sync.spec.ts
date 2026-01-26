import { test, expect } from "@playwright/test";

test.describe("Cloud Sync UI", () => {
    test.beforeEach(async ({ page }) => {
        // Basic setup to get to the main page
        await page.goto("/");
    });

    test("should open and close the cloud sync menu", async ({ page }) => {
        const cloudBtn = page.getByTestId("cloud-status-button");
        const menu = page.getByTestId("cloud-status-menu");
        const closeBtn = page.getByTestId("cloud-status-close");

        // 1. Initially menu should not be visible
        await expect(menu).not.toBeVisible();

        // 2. Click cloud icon to open
        await cloudBtn.click();
        await expect(menu).toBeVisible();

        // 3. Click cloud icon again to close
        await cloudBtn.click();
        await expect(menu).not.toBeVisible();

        // 4. Click cloud icon to open again
        await cloudBtn.click();
        await expect(menu).toBeVisible();

        // 5. Click "X" button to close
        await closeBtn.click();
        await expect(menu).not.toBeVisible();
    });

    test("should not close when clicking inside the menu", async ({ page }) => {
        const cloudBtn = page.getByTestId("cloud-status-button");
        const menu = page.getByTestId("cloud-status-menu");

        await cloudBtn.click();
        await expect(menu).toBeVisible();

        // Click inside the menu (on the title span)
        await page.getByText("Cloud Sync", { exact: true }).click();
        await expect(menu).toBeVisible();
    });

    test("should not close when clicking outside the menu (as per user request)", async ({ page }) => {
        const cloudBtn = page.getByTestId("cloud-status-button");
        const menu = page.getByTestId("cloud-status-menu");

        await cloudBtn.click();
        await expect(menu).toBeVisible();

        // Click outside (on the body or some other element)
        await page.locator("body").click({ position: { x: 10, y: 10 } });
        await expect(menu).toBeVisible();
    });
});
