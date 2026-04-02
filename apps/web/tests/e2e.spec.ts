import { test, expect } from "@playwright/test";

test.describe("Vault E2E", () => {
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
        console.log(
          `[E2E Wait] Current vault status: ${status}, isInitialized: ${(window as any).vault?.isInitialized}`,
        );
        return status === "idle";
      },
      {
        timeout: 15000,
      },
    );
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Auto-initializes Default Vault", async ({ page }) => {
    await expect(page.getByTitle("Switch Vault")).toContainText(
      /Default Vault|Local Vault/,
    );
    // Should be empty initially — when 0 entities, the UI shows "NO ARCHIVE" instead of entity-count
    await expect(page.getByText("NO ARCHIVE")).toBeVisible();
  });

  test("Create Entity Updates Graph", async ({ page }) => {
    // Create Node A
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node A");
    await page.getByRole("button", { name: "ADD" }).click();
    await expect(page.getByTestId("entity-count")).toHaveText("1 CHRONICLE");

    // Create Node B
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node B");
    await page.getByRole("button", { name: "ADD" }).click();
    await expect(page.getByTestId("entity-count")).toHaveText("2 CHRONICLES");

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
    await page.getByPlaceholder("Chronicle Title...").fill("Source Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // 1. Toggle via Keyboard 'C'
    await page.keyboard.press("c");
    await expect(page.getByText("Select Source Entity")).toBeVisible();

    // Toggle off via Keyboard 'C'
    await page.keyboard.press("c");
    await expect(page.getByText("Select Source Entity")).not.toBeVisible();
  });

  test("Toggle Node Labels Shortcut", async ({ page }) => {
    // 1. Initial State: Labels should be shown by default
    const isShownInitially = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isShownInitially).toBe(true);

    // 2. Toggle Off
    await page.evaluate(() => (window as any).graph.toggleLabels());
    const isHiddenAfterPress = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isHiddenAfterPress).toBe(false);

    // Verify Cytoscape style reflects this
    // Create a node first to be sure we can check style.
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Test Node");
    await page.getByRole("button", { name: "ADD" }).click();

    const labelStyleAfterHide = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy.nodes()[0]?.style("label");
    });
    expect(labelStyleAfterHide).toBe("");

    // 3. Toggle back On
    await page.evaluate(() => (window as any).graph.toggleLabels());
    const isShownAgain = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isShownAgain).toBe(true);

    const labelStyleAfterShow = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy.nodes()[0]?.style("label");
    });
    expect(labelStyleAfterShow).not.toBe("");
  });
});
