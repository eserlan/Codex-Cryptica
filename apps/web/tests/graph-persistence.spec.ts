import { test, expect } from "@playwright/test";

test.describe("Graph Deletion Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Wait for vault initialization
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
  });

  test("deleting an entity in the graph should persist after reload", async ({
    page,
  }) => {
    // 1. Create an entity
    const title = `Persistent Deletion Test ${Date.now()}`;
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill(title);
    await page.getByRole("button", { name: "ADD" }).click();

    // Verify it exists in graph
    await expect(page.getByText(title).first()).toBeVisible();

    // 2. Delete the entity via the vault store (most reliable way in tests)
    await page.evaluate(async (t) => {
      const vault = (window as any).vault;
      const entityId = Object.keys(vault.entities).find(
        (id) => vault.entities[id].title === t,
      );
      if (entityId) {
        await vault.deleteEntity(entityId);
      }
    }, title);

    // Verify it's gone from UI
    await expect(page.getByText(title).first()).not.toBeVisible();

    // 3. Reload the page
    await page.reload();
    await expect(page.getByTestId("graph-canvas")).toBeVisible();

    // Wait for vault idle again
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

    // 4. Verify it's STILL gone (this tests the Dexie cache cleanup)
    await expect(page.getByText(title).first()).not.toBeVisible();

    // Check internal store state too
    const existsInStore = await page.evaluate((t) => {
      const vault = (window as any).vault;
      return Object.values(vault.entities).some((e: any) => e.title === t);
    }, title);

    expect(existsInStore).toBe(false);
  });
});
