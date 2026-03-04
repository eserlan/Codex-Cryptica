import { test, expect } from "@playwright/test";

test.describe("Selection Connector", () => {
  test("should show connect button when two nodes are selected and create connection", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Create two entities
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node A");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node B");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for entities to be created
    await expect(page.getByTestId("entity-count")).toHaveText("2 CHRONICLES", {
      timeout: 10000,
    });

    // Select both nodes programmatically
    await page.evaluate(async () => {
      const waitForNodes = () =>
        new Promise((resolve) => {
          const check = () => {
            const cy = (window as any).cy;
            if (cy && cy.nodes().length === 2) {
              resolve(cy);
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });
      const cy = (await waitForNodes()) as any;
      cy.nodes().select();
    });

    // Check if Connect button is visible
    const connectBtn = page.getByRole("button", { name: "Connect Selection" });
    await expect(connectBtn).toBeVisible();

    // Click Connect
    await connectBtn.click();

    // Should see label input
    const labelInput = page.getByPlaceholder("e.g. Brother, Rival...");
    await expect(labelInput).toBeVisible();

    // Fill label and press Enter
    await labelInput.fill("Friend");
    await page.keyboard.press("Enter");

    // Verify notification
    await expect(page.getByText("Connected Node A to Node B")).toBeVisible();

    // Verify connection in the store
    const hasConnection = await page.evaluate(() => {
      const vault = (window as any).vault;
      const entities = Object.values(vault.entities) as any[];
      const nodeA = entities.find((e) => e.title === "Node A");
      const nodeB = entities.find((e) => e.title === "Node B");
      if (!nodeA || !nodeB) return false;

      return (
        nodeA.connections?.some(
          (c: any) => c.target === nodeB.id && c.label === "Friend",
        ) ||
        nodeB.connections?.some(
          (c: any) => c.target === nodeA.id && c.label === "Friend",
        )
      );
    });

    expect(hasConnection).toBe(true);
  });

  test("should prefill last used label and show recent label chips", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem("codex_last_connection_label", "Old Friend");
      localStorage.setItem(
        "codex_recent_connection_labels",
        JSON.stringify(["Rival", "Ally"]),
      );
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Create two entities
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node C");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node D");
    await page.getByRole("button", { name: "ADD" }).click();

    // Select both nodes programmatically
    await page.evaluate(async () => {
      const waitForNodes = () =>
        new Promise((resolve) => {
          const check = () => {
            const cy = (window as any).cy;
            if (cy && cy.nodes().length === 2) {
              resolve(cy);
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });
      const cy = (await waitForNodes()) as any;
      cy.nodes().select();
    });

    // Click Connect
    await page.getByRole("button", { name: "Connect Selection" }).click();

    // Verify prefilled value
    const labelInput = page.getByPlaceholder("e.g. Brother, Rival...");
    await expect(labelInput).toHaveValue("Old Friend");

    // Verify recent chips
    await expect(page.getByRole("button", { name: "Rival" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ally" })).toBeVisible();

    // Click Rival chip
    await page.getByRole("button", { name: "Rival" }).click();

    // Verify notification
    await expect(page.getByText("Connected Node C to Node D")).toBeVisible();

    // Verify connection was created with "Rival"
    const hasConnection = await page.evaluate(() => {
      const vault = (window as any).vault;
      const entities = Object.values(vault.entities) as any[];
      const nodeC = entities.find((e) => e.title === "Node C");
      const nodeD = entities.find((e) => e.title === "Node D");
      if (!nodeC || !nodeD) return false;

      return (
        nodeC.connections?.some(
          (c: any) => c.target === nodeD.id && c.label === "Rival",
        ) ||
        nodeD.connections?.some(
          (c: any) => c.target === nodeC.id && c.label === "Rival",
        )
      );
    });

    expect(hasConnection).toBe(true);
  });
});
