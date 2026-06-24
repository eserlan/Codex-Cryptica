import { test, expect } from "@playwright/test";
import { seedEntity, seedEntities, setupVaultPage } from "./test-helpers";

/**
 * Regression for the Entity Table (list) view: opening an entity from the table
 * and then closing it must return the user to the table — never strand them on
 * the blank black standalone-entity backdrop. See #1509 follow-up.
 *
 * The standalone entity route (/vault/[id]/entity/[entityId]) is also the popout
 * route. When reached by in-app navigation, window.close() is a no-op, and a
 * plain history.back() only steps one entry — which can land on ANOTHER entity
 * backdrop, leaving a blank screen. Closing must reliably exit to a real view.
 */
test.describe("Table view → entity → close", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("closing an entity opened from the table returns to the table", async ({
    page,
  }) => {
    const id = await seedEntity(page, {
      title: "Closable From Table",
      content: "Opened from the table view.",
    });

    await page.goto("/table");
    const row = page
      .getByTestId("entity-table-row")
      .filter({ hasText: "Closable From Table" });
    await expect(row).toBeVisible();

    await row.getByTestId("entity-table-row-link").click();

    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/entity/${id}$`));

    await page.getByRole("button", { name: "Close" }).click();

    await expect(page).toHaveURL(/\/table$/);
    await expect(modal).toBeHidden();
    await expect(row).toBeVisible();
  });

  test("closing after entity→entity navigation returns to the table, not a blank backdrop", async ({
    page,
  }) => {
    const [, beta] = await seedEntities(page, [
      { title: "Entity Alpha", content: "alpha" },
      { title: "Entity Beta", content: "beta" },
    ]);

    await page.goto("/table");
    await page.getByTestId("entity-table-row-link").first().click();
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();

    // Navigate from one standalone entity route to another via the SvelteKit
    // client router (mirrors following an in-zen link — a client-side
    // navigation, not a full reload). The intermediate backdrop is what a naive
    // history.back() would strand the user on.
    const vaultId = await page.evaluate(
      () => (window as any).vault.activeVaultId as string,
    );
    // SvelteKit intercepts clicks on internal <a> links for client-side
    // navigation, the same as an in-zen connection link.
    await page.evaluate(
      ([vid, id]) => {
        const a = document.createElement("a");
        a.href = `/vault/${vid}/entity/${id}`;
        a.textContent = "go";
        document.body.appendChild(a);
        a.click();
      },
      [vaultId, beta] as const,
    );
    await expect(page).toHaveURL(new RegExp(`/entity/${beta}$`));
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();

    // Must land back on the table (the remembered originating view) — not on the
    // previous entity's blank backdrop.
    await expect(page).toHaveURL(/\/table$/);
    await expect(page.getByTestId("zen-mode-modal")).toBeHidden();
    await expect(page.getByTestId("entity-table-row").first()).toBeVisible();
  });
});
