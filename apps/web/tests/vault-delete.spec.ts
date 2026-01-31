import { test, expect } from "@playwright/test";

test.describe("Vault Node Deletion", () => {
    test.beforeEach(async ({ page }) => {
        // Mock window.showDirectoryPicker
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;
            // @ts-expect-error - Mock browser API
            window.showDirectoryPicker = async () => {
                return {
                    kind: "directory",
                    name: "test-vault",
                    requestPermission: async () => "granted",
                    queryPermission: async () => "granted",
                    values: async function* () { yield* []; },
                    getFileHandle: async (name: string, _options?: any) => {
                        return {
                            kind: "file",
                            name,
                            getFile: async () => new File(["---\ntitle: " + name.replace('.md', '') + "\n---\nContent"], name),
                            createWritable: async () => ({
                                write: async () => {},
                                close: async () => {}
                            })
                        };
                    },
                    getDirectoryHandle: async (name: string, _options?: any) => {
                        return {
                            kind: "directory",
                            name,
                            removeEntry: async () => {}
                        };
                    },
                    removeEntry: async () => {}
                };
            };
        });

        await page.goto("/");
        await page.getByRole("button", { name: "OPEN VAULT" }).click();
    });

    test("should delete a node and its file", async ({ page }) => {
        // 1. Create a node to delete
        const newButton = page.getByTestId("new-entity-button");
        await newButton.click();
        
        await page.locator('input[placeholder="Entry Title..."]').fill("Delete Me");
        await page.getByRole("button", { name: "ADD" }).click();

        // 2. Open the node
        await page.getByText("Delete Me").first().click();
        await expect(page.getByText("Chronicle")).toBeVisible();

        // 3. Trigger deletion
        const deleteButton = page.getByRole("button", { name: "DELETE" });
        
        // Handle confirmation dialog
        page.once('dialog', dialog => {
            expect(dialog.message()).toContain('Are you sure');
            dialog.accept();
        });

        await deleteButton.click();

        // 4. Verify node is gone from UI
        await expect(page.getByText("Delete Me")).not.toBeVisible();
        await expect(page.getByText("Chronicle")).not.toBeVisible(); // Detail panel closed
    });

    test("should cancel deletion", async ({ page }) => {
        // 1. Create a node
        const newButton = page.getByTestId("new-entity-button");
        await newButton.click();
        await page.locator('input[placeholder="Entry Title..."]').fill("Keep Me");
        await page.getByRole("button", { name: "ADD" }).click();

        // 2. Open the node
        await page.getByText("Keep Me").first().click();

        // 3. Trigger and cancel deletion
        page.once('dialog', dialog => {
            dialog.dismiss();
        });

        await page.getByRole("button", { name: "DELETE" }).click();

        // 4. Verify node still exists
        await expect(page.getByText("Keep Me").first()).toBeVisible();
        await expect(page.getByText("Chronicle")).toBeVisible();
    });
});
