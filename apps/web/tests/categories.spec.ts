import { test, expect } from "@playwright/test";

test.describe("Category Architecture Modal", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        // Force configured state for settings menu
        await page.evaluate(() => {
            (window as any).TEST_FORCE_CONFIGURED = true;
        });
        // Wait for vault to initialize
        await page.waitForFunction(() => (window as any).vault?.status === 'idle');
        // Simulate connected cloud state so manage-categories-button is visible
        await page.evaluate(() => {
            const cloudConfig = (window as any).cloudConfig;
            if (cloudConfig) {
                cloudConfig.setEnabled(true);
                cloudConfig.setConnectedEmail('test@example.com');
            }
        });
    });

    test("should open Category Architecture modal and display default categories", async ({ page }) => {
        // 1. Open main Settings
        await page.getByTestId("cloud-status-button").click();
        await expect(page.getByTestId("cloud-status-menu")).toBeVisible();

        // 2. Open Category Manager
        await page.getByTestId("manage-categories-button").click();

        // 3. Verify Modal is visible
        await expect(page.getByText("Category Architecture")).toBeVisible();

        // 4. Verify default categories are loaded (check for NPC which is a default category)
        const hasNpc = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            return inputs.some(input => (input as HTMLInputElement).value === 'NPC');
        });
        expect(hasNpc).toBe(true);

        // 5. Verify the new category input and ADD button exist
        await expect(page.getByPlaceholder("New category...")).toBeVisible();
        await expect(page.getByRole("button", { name: "ADD" })).toBeVisible();

        // 6. Close modal
        await page.getByRole("button", { name: "DONE" }).click();
        await expect(page.getByText("Category Architecture")).not.toBeVisible();
    });

    test("should add a new category in session", async ({ page }) => {
        // Open settings and category manager
        await page.getByTestId("cloud-status-button").click();
        await expect(page.getByTestId("cloud-status-menu")).toBeVisible();
        await page.getByTestId("manage-categories-button").click();
        await expect(page.getByText("Category Architecture")).toBeVisible();

        // Count initial categories
        const initialCount = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            return inputs.filter(input => (input as HTMLInputElement).value).length;
        });

        // Add new category
        await page.getByPlaceholder("New category...").fill("Artifact");
        await page.getByRole("button", { name: "ADD" }).click();

        // Wait a bit for the UI to update
        await page.waitForTimeout(300);

        // Verify new category was added
        const newCount = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            return inputs.filter(input => (input as HTMLInputElement).value).length;
        });
        expect(newCount).toBe(initialCount + 1);

        // Verify "Artifact" exists in the list
        const hasArtifact = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            return inputs.some(input => (input as HTMLInputElement).value === 'Artifact');
        });
        expect(hasArtifact).toBe(true);
    });

    test("should open and close glyph library picker", async ({ page }) => {
        // Open settings and category manager
        await page.getByTestId("cloud-status-button").click();
        await page.getByTestId("manage-categories-button").click();
        await expect(page.getByText("Category Architecture")).toBeVisible();

        // Open glyph library via "Select Icon" button
        await page.getByTitle("Select Icon").click();
        await expect(page.getByText("Glyph Library")).toBeVisible();

        // Verify icons are present
        const iconCount = await page.locator('button[title^="icon-[lucide"]').count();
        expect(iconCount).toBeGreaterThan(10);

        // Close by clicking outside or selecting an icon
        await page.getByTitle("icon-[lucide--star]").click();
        await expect(page.getByText("Glyph Library")).not.toBeVisible();
    });

    test("should reset categories to defaults", async ({ page }) => {
        // Open settings and category manager
        await page.getByTestId("cloud-status-button").click();
        await page.getByTestId("manage-categories-button").click();
        await expect(page.getByText("Category Architecture")).toBeVisible();

        // Delete NPC category naturally
        const npcInput = page.locator('input[value="NPC"]');
        const row = page.locator('div.group').filter({ has: npcInput });
        await row.hover(); 
        await row.getByTitle("Delete Category").click();
        
        await expect(npcInput).not.toBeVisible();

        // Click Reset to Defaults
        await page.getByRole("button", { name: /RESET TO DEFAULTS/i }).click();
        
        // Verify NPC is back
        await expect(npcInput).toBeVisible();
    });
});
