import { test, expect } from "@playwright/test";

test.describe("Graph Initial Load", () => {
  test("all nodes in cytoscape are visible and not pending layout on page load/reload", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });

    page.on("console", (msg) => {
      console.log(`[BROWSER] [${msg.type()}] ${msg.text()}`);
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Create Test Source
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Test Source");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for first modal to close
    await expect(page.getByPlaceholder("Chronicle Title...")).not.toBeVisible({
      timeout: 10000,
    });

    // Wait for the entity to appear in the vault store
    await page.waitForFunction(
      () => {
        const vault = (window as any).vault;
        return (
          vault &&
          Object.values(vault.entities).some(
            (e: any) => e.title === "Test Source",
          )
        );
      },
      null,
      { timeout: 10000 },
    );

    // Create Test Target
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Test Target");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for second modal to close
    await expect(page.getByPlaceholder("Chronicle Title...")).not.toBeVisible({
      timeout: 10000,
    });

    // Wait for the entity to appear in the vault store
    await page.waitForFunction(
      () => {
        const vault = (window as any).vault;
        return (
          vault &&
          Object.values(vault.entities).some(
            (e: any) => e.title === "Test Target",
          )
        );
      },
      null,
      { timeout: 10000 },
    );

    // Wait for entities count to show 2 CHRONICLES
    await expect(page.getByTestId("entity-count")).toHaveText("2 CHRONICLES", {
      timeout: 10000,
    });

    // Now reload the page to simulate initial load with pre-existing nodes
    await page.reload();
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Wait for vault to finish loading
    await page.evaluate(async () => {
      const waitForVault = () =>
        new Promise((resolve) => {
          const check = () => {
            const vault = (window as any).vault;
            if (vault && vault.status === "idle") {
              resolve(true);
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });
      await waitForVault();
    });

    // Check if there are indeed 2 nodes in cytoscape
    const nodesCount = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy ? cy.nodes().length : 0;
    });

    expect(nodesCount).toBe(2);

    // Verify no nodes remain with isPendingLayout or pending-layout class
    // This will wait for the load finalization layout to compute and execute.
    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        if (!cy) return false;
        const pendingCount =
          cy.nodes("[isPendingLayout]").length +
          cy.nodes(".pending-layout").length;
        return pendingCount === 0;
      },
      null,
      { timeout: 15000 },
    );

    // Verify all nodes have opacity != 0
    const hiddenNodesCount = await page.evaluate(() => {
      const cy = (window as any).cy;
      if (!cy) return 0;
      return cy
        .nodes()
        .filter(
          (n: any) => n.style("opacity") === "0" || n.style("opacity") === 0,
        ).length;
    });

    expect(hiddenNodesCount).toBe(0);
  });
});
