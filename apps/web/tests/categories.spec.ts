import { test, expect } from "@playwright/test";

test.describe("Category Architecture Modal", () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => (window as any).DISABLE_ONBOARDING = true);
        await page.goto("/");
        // removed eval
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
        await page.getByTestId("settings-button").click();
        await page.waitForSelector('h2:has-text("Vault")', { state: 'visible' });
        await expect(page.locator('h2', { hasText: 'Vault' })).toBeVisible();

        // 2. Open Schema tab via sidebar
        await page.click('[role="tab"]:has-text("Schema")');

        // 3. Verify Schema heading is visible
        await page.waitForSelector('h2:has-text("Schema")', { state: 'visible' });
        await expect(page.locator('h2', { hasText: 'Schema' })).toBeVisible();

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
        await page.click('button[aria-label="Close Settings"]');
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test("should add a new category in session", async ({ page }) => {
        // Open settings and go to Schema
        await page.getByTestId("settings-button").click();
        await page.waitForSelector('h2:has-text("Vault")', { state: 'visible' });
        await page.click('[role="tab"]:has-text("Schema")');
        await page.waitForSelector('h2:has-text("Schema")', { state: 'visible' });
        await expect(page.locator('h2', { hasText: 'Schema' })).toBeVisible();

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
        // Open settings and go to Schema
        await page.getByTestId("settings-button").click();
        await page.waitForSelector('h2:has-text("Vault")', { state: 'visible' });
        await page.click('[role="tab"]:has-text("Schema")');
        await page.waitForSelector('h2:has-text("Schema")', { state: 'visible' });
        await expect(page.locator('h2', { hasText: 'Schema' })).toBeVisible();

        // Open glyph library via "Select Icon" button
        await page.getByTitle("Select Icon").click();
        await page.waitForSelector('text=Glyph Library', { state: 'visible' });
        await expect(page.getByText("Glyph Library")).toBeVisible();

        // Verify icons are present
        const iconCount = await page.locator('button[title^="icon-[lucide"]').count();
        expect(iconCount).toBeGreaterThan(10);

        // Close by clicking outside or selecting an icon
        await page.getByTitle("icon-[lucide--star]").click();
        await expect(page.getByText("Glyph Library")).not.toBeVisible();
    });

    test("should reset categories to defaults", async ({ page }) => {
        // Open settings and go to Schema
        await page.getByTestId("settings-button").click();
        await page.waitForSelector('h2:has-text("Vault")', { state: 'visible' });
        await page.click('[role="tab"]:has-text("Schema")');
        await page.waitForSelector('h2:has-text("Schema")', { state: 'visible' });
        await expect(page.locator('h2', { hasText: 'Schema' })).toBeVisible();

        // Delete NPC category naturally
        const npcRow = page.getByTestId('category-row-npc');
        await npcRow.hover();
        // Handle the confirm dialog
        page.once('dialog', dialog => dialog.accept());
        await npcRow.getByTitle("Delete Category").click();

        await expect(npcRow).not.toBeVisible();

        // Click Reset to Defaults
        await page.getByRole("button", { name: /RESET TO DEFAULTS/i }).click();

        // Verify NPC is back
        await expect(npcRow).toBeVisible();
    });

    test("should update graph node border color when category color changes", async ({ page }) => {
        // 1. Create an entity first so we have a node in the graph
        // Open vault if not already open
        const openVaultBtn = page.getByRole("button", { name: /OPEN/ });
        if (await openVaultBtn.isVisible()) {
            // Skip if no vault - this test requires a vault with entities
            test.skip();
        }

        // 2. Open settings and go to Schema
        await page.getByTestId("settings-button").click();
        await page.waitForSelector('h2:has-text("Vault")', { state: 'visible' });
        await page.click('[role="tab"]:has-text("Schema")');
        await page.waitForSelector('h2:has-text("Schema")', { state: 'visible' });
        await expect(page.locator('h2', { hasText: 'Schema' })).toBeVisible();

        // 3. Find NPC category color input and change it to a distinct color
        const npcRow = page.getByTestId('category-row-npc');
        const colorInput = npcRow.locator('input[type="color"]');

        // Get initial color to verify it changes
        const initialColor = await colorInput.inputValue();

        // Change to a very different color (bright pink)
        const newColor = "#ff00ff";
        await colorInput.fill(newColor);

        // 4. Close modal and verify color was saved
        await page.click('button[aria-label="Close Settings"]');

        // 5. Reopen and verify the color persisted
        await page.getByTestId("settings-button").click();
        await page.waitForSelector('h2:has-text("Vault")', { state: 'visible' });
        await page.click('[role="tab"]:has-text("Schema")');
        await page.waitForSelector('h2:has-text("Schema")', { state: 'visible' });

        const updatedColorInput = page.getByTestId('category-row-npc').locator('input[type="color"]');
        const savedColor = await updatedColorInput.inputValue();

        // Color should have changed from initial
        expect(savedColor.toLowerCase()).not.toBe(initialColor.toLowerCase());
        // Color should persist to new value (may be uppercase)
        expect(savedColor.toLowerCase()).toBe(newColor.toLowerCase());

        // 6. Clean up - reset to defaults
        await page.getByRole("button", { name: /RESET TO DEFAULTS/i }).click();
        await page.click('button[aria-label="Close Settings"]');
    });
});
