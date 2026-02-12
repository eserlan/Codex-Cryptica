import { test, expect } from "@playwright/test";

test.describe("Vault E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for initialization (OPFS auto-load)
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Auto-initializes Default Vault", async ({ page }) => {
    await expect(page.getByTitle("Switch Vault")).toContainText(
      /Default Vault|Local Vault/,
    );
    // Should be empty initially — when 0 entities, the UI shows "NO VAULT" instead of entity-count
    await expect(page.getByText("NO VAULT")).toBeVisible();
  });

  test("Create Entity Updates Graph", async ({ page }) => {
    // Create Node A
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Node A");
    await page.getByRole("button", { name: "ADD" }).click();
    await expect(page.getByTestId("entity-count")).toHaveText("1 ENTITIES");

    // Create Node B
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Node B");
    await page.getByRole("button", { name: "ADD" }).click();
    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES");

    // Verify Search
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder("Search (Cmd+K)...").fill("Node A");
    await expect(page.getByTestId("search-result").first()).toContainText(
      "Node A",
    );
    await page.keyboard.press("Escape");
  });

  test("Connect Mode UI", async ({ page }) => {
    // Need at least one node to connect
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Source Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // 1. Toggle via Button
    const connectBtn = page.getByTitle("Connect Mode (C)");
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();

    // Should show "SELECT SOURCE NODE"
    await expect(page.getByText("> SELECT SOURCE NODE")).toBeVisible();

    // Toggle off
    await connectBtn.click();
    await expect(page.getByText("> SELECT SOURCE NODE")).not.toBeVisible();

    // 2. Toggle via Keyboard 'C'
    await page.keyboard.press("c");
    await expect(page.getByText("> SELECT SOURCE NODE")).toBeVisible();
  });
});
