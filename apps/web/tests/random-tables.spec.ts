import { test, expect, type Page } from "@playwright/test";

/**
 * Author → roll → history, the whole US1 journey (#2247, SC-001, FR-018).
 *
 * The roll itself runs offline: a table is the user's own content and must
 * never depend on the network (FR-020, SC-005).
 */

async function bootVault(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("codex_skip_landing", "true");
    // The die roller — and with it the shared roll history — is hidden in
    // Guided Mode, which is on by default.
    localStorage.setItem("codex_guided_mode_active", "false");
    localStorage.setItem(
      "codex-cryptica-help-state",
      JSON.stringify({ completedTours: ["initial-onboarding"] }),
    );
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const enterBtn = page.getByRole("button", { name: /ENTER THE CODEX/i });
  if (await enterBtn.isVisible().catch(() => false)) await enterBtn.click();

  await page.waitForFunction(() => (window as any).vault?.status === "idle");
  await page.evaluate(() => {
    const ui = (window as any).uiStore;
    if (ui) {
      ui.dismissedWorldPage = true;
      ui.dismissedLandingPage = true;
    }
  });

  await expect(page.getByTestId("dice-roller-button")).toBeVisible({
    timeout: 30000,
  });
}

async function addEntry(page: Page, index: number, text: string) {
  await page.getByTestId("add-entry").click();
  await page.getByTestId("entry-text").nth(index).fill(text);
}

test.describe("Random tables", () => {
  test.beforeEach(async ({ page }) => {
    await bootVault(page);
    await page.goto("/tables");
    await expect(page.getByTestId("new-table")).toBeVisible({ timeout: 30000 });
  });

  test("creates a table, rolls it, and records the roll in history", async ({
    page,
  }) => {
    await page.getByTestId("new-table").click();

    const editor = page.getByTestId("table-editor");
    await expect(editor).toBeVisible();
    await page.getByTestId("table-name").fill("Tavern rumours");

    await addEntry(page, 0, "The miller has not been seen for a week.");
    await addEntry(page, 1, "A cold light burns in the old chapel.");

    await page.getByTestId("roll-table").click();

    const result = page.getByTestId("roll-result");
    await expect(result).toBeVisible();
    await expect(result).toContainText(/miller|chapel/);
    await expect(page.getByTestId("roll-die-value")).not.toBeEmpty();

    // The roll belongs to the same history as every other roll (FR-018).
    await page.getByTestId("dice-roller-button").click();
    const modal = page.getByTestId("dice-modal");
    await expect(modal).toBeVisible({ timeout: 15000 });
    await expect(modal.getByTestId("roll-source-name").first()).toHaveText(
      "Tavern rumours",
    );
    await expect(modal.getByTestId("roll-source-text").first()).toContainText(
      /miller|chapel/,
    );
  });

  test("rolls with no network request in flight", async ({ page, context }) => {
    await page.getByTestId("new-table").click();
    await page.getByTestId("table-name").fill("Offline table");
    await addEntry(page, 0, "It still works.");

    // The dev server keeps serving its own module graph over localhost, which
    // is not what FR-020 is about: nothing may leave the machine.
    const offsite: string[] = [];
    page.on("request", (request) => {
      if (!request.url().startsWith("http://localhost:")) {
        offsite.push(request.url());
      }
    });

    await context.setOffline(true);
    await page.getByTestId("roll-table").click();
    await expect(page.getByTestId("roll-result")).toHaveText("It still works.");
    await context.setOffline(false);

    expect(offsite).toEqual([]);
  });

  test("filters the list by name and by label", async ({ page }) => {
    await page.getByTestId("new-table").click();
    await page.getByTestId("table-name").fill("Weather");
    await page.getByTestId("table-label-input").fill("outdoors");
    await page.getByTestId("table-label-input").press("Enter");
    await addEntry(page, 0, "Rain, steady and grey.");

    await page.getByTestId("new-table").click();
    await page.getByTestId("table-name").fill("Loot");
    await addEntry(page, 0, "A tarnished silver ring.");

    await expect(page.getByTestId("table-list-item")).toHaveCount(2);

    await page.getByTestId("table-search").fill("weath");
    await expect(page.getByTestId("table-list-item")).toHaveCount(1);

    await page.getByTestId("table-search").fill("");
    await page.getByRole("button", { name: "outdoors", exact: true }).click();
    await expect(page.getByTestId("table-list-item")).toHaveText(/Weather/);
  });
});
