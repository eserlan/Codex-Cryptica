import { test, expect } from "@playwright/test";

test.describe("Help Onboarding Walkthrough", () => {
    test.beforeEach(async ({ page }) => {
        // Ensure clean state
        await page.goto("/");
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload();
    });

    test("should automatically start onboarding for new users", async ({ page }) => {
        // 1. Check if welcome modal appears
        await expect(page.getByText("Welcome to Codex Cryptica")).toBeVisible();
        
        // 2. Click Next
        await page.getByRole("button", { name: "Next" }).click({ force: true });
        
        // 3. Check if Vault step is highlighted (Vault info should be visible)
        await expect(page.getByText("Your Archive")).toBeVisible();
        
        // 4. Navigate through all steps
        await page.getByRole("button", { name: "Next" }).click({ force: true }); // Search
        await expect(page.getByText("Omni-Search")).toBeVisible();
        
        await page.getByRole("button", { name: "Next" }).click({ force: true }); // Graph
        await expect(page.getByText("Knowledge Graph")).toBeVisible();
        
        await page.getByRole("button", { name: "Next" }).click({ force: true }); // Oracle
        await expect(page.getByText("Lore Oracle")).toBeVisible();
        
        await page.getByRole("button", { name: "Next" }).click({ force: true }); // Settings
        await expect(page.getByText("Configuration")).toBeVisible();
        
        // 5. Finish tour
        await page.getByRole("button", { name: "Finish" }).click({ force: true });
        
        // 6. Verify tour is gone and doesn't reappear
        await expect(page.getByText("Configuration")).not.toBeVisible();
        await page.reload();
        await expect(page.getByText("Welcome to Codex Cryptica")).not.toBeVisible();
    });

    test("should allow skipping the tour", async ({ page }) => {
        await expect(page.getByText("Welcome to Codex Cryptica")).toBeVisible();
        await page.getByRole("button", { name: "Dismiss" }).click({ force: true });
        await expect(page.getByText("Welcome to Codex Cryptica")).not.toBeVisible();
        
        // Verify it doesn't reappear
        await page.reload();
        await expect(page.getByText("Welcome to Codex Cryptica")).not.toBeVisible();
    });

    test("should show contextual hints for advanced features", async ({ page }) => {
        // Skip onboarding
        await expect(page.getByText("Welcome to Codex Cryptica")).toBeVisible();
        await page.getByRole("button", { name: "Dismiss" }).click({ force: true });

        // 1. Activate Connect Mode (press C)
        await page.keyboard.press("c");
        
        // 2. Verify hint appears
        await expect(page.getByText("CONNECT MODE")).toBeVisible();
        
        // 3. Dismiss hint
        await page.getByTestId("dismiss-hint-button").click({ force: true });
        
        // Wait for removal
        await expect(page.getByText("Click a source node")).not.toBeVisible();
        
        // 4. Verify it stays dismissed
        await page.keyboard.press("c"); // toggle off
        await page.keyboard.press("c"); // toggle on
        await expect(page.getByText("Click a source node")).not.toBeVisible();
    });
});
