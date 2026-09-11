import { test, expect, type Page } from "@playwright/test";
import { setupVaultPage } from "./test-helpers";

/**
 * Paste-import of a real-sized table (#2247, SC-002, FR-034 – FR-038).
 *
 * The import runs offline, because pasting a table someone else published is
 * exactly the moment a user would resent a network round trip (FR-038).
 */

const HUNDRED_ROWS = Array.from(
  { length: 100 },
  (_, i) => `${i + 1}\tResult number ${i + 1}`,
).join("\n");

async function openTables(page: Page) {
  await setupVaultPage(page);
  await page.goto("/tables");
  await expect(page.getByTestId("open-import")).toBeVisible({ timeout: 30000 });
}

test.describe("Random table import", () => {
  // These journeys touch the vault on disk and, on a cold dev server, wait on
  // first compiles: the default 30s is tight enough to fail on load alone.
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await openTables(page);
  });

  test("imports a 100-row d100 table offline and rolls it", async ({
    page,
    context,
  }) => {
    const offsite: string[] = [];
    page.on("request", (request) => {
      if (!request.url().startsWith("http://localhost:")) {
        offsite.push(request.url());
      }
    });

    await page.getByTestId("open-import").click();
    await page.getByTestId("import-name").fill("Hundred results");

    await context.setOffline(true);
    await page.getByTestId("import-paste").fill(HUNDRED_ROWS);

    await expect(page.getByTestId("import-summary")).toContainText("100 ready");
    await page.getByTestId("import-confirm").click();

    // The imported table opens in the editor, entries and all.
    await expect(page.getByTestId("table-editor")).toBeVisible();
    await expect(page.getByTestId("table-name")).toHaveValue("Hundred results");

    await page.getByTestId("roll-table").click();
    await expect(page.getByTestId("roll-result")).toContainText(
      /Result number \d+/,
    );

    await context.setOffline(false);
    expect(offsite).toEqual([]);
  });

  test("keeps the batch when a row cannot be read", async ({ page }) => {
    await page.getByTestId("open-import").click();
    await page.getByTestId("import-name").fill("Mixed paste");
    await page
      .getByTestId("import-paste")
      .fill("1-2\tA lone wolf\nnot a range\tA broken cart\n3-4\tAn empty camp");

    // One row is a problem; the other two are already usable (FR-035).
    await expect(page.getByTestId("import-problem")).toHaveCount(1);
    await expect(page.getByTestId("import-summary")).toContainText("2 ready");

    await page.getByTestId("import-accept").click();
    await expect(page.getByTestId("import-summary")).toContainText("3 ready");

    await page.getByTestId("import-confirm").click();
    await expect(page.getByTestId("entry-text")).toHaveCount(3);
  });

  test("asks what to do when the name is already taken", async ({ page }) => {
    await page.getByTestId("open-import").click();
    await page.getByTestId("import-name").fill("Rumours");
    await page.getByTestId("import-paste").fill("A first rumour");
    await page.getByTestId("import-confirm").click();
    await expect(page.getByTestId("table-editor")).toBeVisible();

    await page.getByTestId("open-import").click();
    await page.getByTestId("import-name").fill("Rumours");
    await page.getByTestId("import-paste").fill("A second rumour");

    await expect(page.getByTestId("import-collision")).toBeVisible();
    await expect(page.getByTestId("import-confirm")).toBeDisabled();

    await page.getByTestId("import-collision-merge").click();
    await page.getByTestId("import-confirm").click();

    // Merged into the existing table rather than shadowing it.
    await expect(page.getByTestId("table-list-item")).toHaveCount(1);
    await expect(page.getByTestId("entry-text")).toHaveCount(2);
  });
});
