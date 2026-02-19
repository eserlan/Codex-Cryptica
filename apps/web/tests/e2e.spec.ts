import { test, expect } from "@playwright/test";

test.describe("Vault E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });
    await page.goto("/");
    // Wait for vault initialization (OPFS auto-load)
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });
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

  test("Toggle Node Labels Shortcut", async ({ page }) => {
    // 1. Initial State: Labels should be shown by default
    const isShownInitially = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isShownInitially).toBe(true);

    // 2. Toggle Off
    await page.keyboard.press("l");
    const isHiddenAfterPress = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isHiddenAfterPress).toBe(false);

    // Verify Cytoscape style reflects this
    const _labelStyle = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy.nodes()[0]?.style("label");
    });
    // For 0 entities, this might skip, but Vault E2E beforeEach ensures some state if we added nodes.
    // However, the base e2e.spec.ts starts with NO VAULT.
    // Let's create a node first to be sure we can check style.
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Test Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // Toggle off again (since we just refreshed state potentially)
    if (await page.evaluate(() => (window as any).graph.showLabels)) {
      await page.keyboard.press("l");
    }

    // Wait for the node to appear in cy graph
    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return cy.nodes().nonempty();
      },
      { timeout: 5000 },
    );

    // Now check the label style (returns "" when labels are hidden)
    const currentLabelStyle = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy.nodes().first().style("label");
    });
    expect(currentLabelStyle).toBe("");

    // 3. Toggle On
    await page.keyboard.press("l");
    const isShownAfterSecondPress = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isShownAfterSecondPress).toBe(true);

    const restoredLabelStyle = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy.nodes().first()?.style("label");
    });
    expect(restoredLabelStyle).not.toBe("");

    // 4. Verify blocked when typing in input
    await page.getByTestId("new-entity-button").click();
    const titleInput = page.getByPlaceholder("Entry Title...");
    await titleInput.focus();
    await titleInput.fill("testing labels");
    await page.keyboard.press("l");

    const stillShownWhileTyping = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(stillShownWhileTyping).toBe(true);
  });
});
