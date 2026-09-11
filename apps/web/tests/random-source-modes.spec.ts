import { test, expect, type Page } from "@playwright/test";

/**
 * Use and Build, the two modes of the roll-table and deck workspace
 * (issue 2258).
 *
 * Authoring and playing want opposite layouts, so they are two modes of one
 * shell. These journeys are about which one you land in and what each one will
 * let you do — not about rolling or drawing, which
 * `random-tables.spec.ts` and `random-decks.spec.ts` already cover.
 */

async function boot(page: Page, path: string, width = 1440) {
  await page.addInitScript(() => {
    localStorage.setItem("codex_skip_landing", "true");
    localStorage.setItem("codex_guided_mode_active", "false");
    localStorage.setItem(
      "codex-cryptica-help-state",
      JSON.stringify({ completedTours: ["initial-onboarding"] }),
    );
  });

  await page.setViewportSize({ width, height: width < 768 ? 760 : 900 });
  await page.goto("/");
  await page.waitForFunction(() => (window as any).vault?.status === "idle");
  await page.goto(path);
}

async function newTable(page: Page, name: string, text: string) {
  await page.getByTestId("new-table").click();
  await page.getByTestId("table-name").fill(name);
  await page.getByTestId("table-name").press("Enter");
  await page.getByTestId("add-entry").click();
  await page.getByTestId("entry-text").first().fill(text);
}

test.describe("Workspace modes", () => {
  test.describe.configure({ timeout: 60_000 });

  test.describe("tables", () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, "/tables");
      await expect(page.getByTestId("new-table")).toBeVisible({
        timeout: 30000,
      });
    });

    // Creating something is authoring, so it overrides the play default.
    test("creating a table lands in build, ready to be typed into", async ({
      page,
    }) => {
      await expect(page.getByTestId("source-mode-use")).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await page.getByTestId("new-table").click();

      await expect(page.getByTestId("table-editor")).toBeVisible();
      await expect(page.getByTestId("source-mode-build")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    test("the use view rolls, and offers nothing that edits", async ({
      page,
    }) => {
      await newTable(page, "Omens", "A crow lands on the signpost.");

      await page.getByTestId("source-mode-use").click();
      await expect(page.getByTestId("table-use-view")).toBeVisible();

      await expect(page.getByTestId("source-name")).toHaveText("Omens");
      await expect(page.getByTestId("table-editor")).toBeHidden();
      await expect(page.getByTestId("add-entry")).toBeHidden();
      await expect(page.getByTestId("delete-table")).toBeHidden();
      await expect(page.getByTestId("table-name")).toBeHidden();

      await page.getByTestId("roll-table").click();
      await expect(page.getByTestId("roll-result")).toContainText("crow");
    });

    test("shows the table itself on request, read-only", async ({ page }) => {
      await newTable(page, "Omens", "A crow lands on the signpost.");
      await page.getByTestId("source-mode-use").click();

      await expect(page.getByTestId("peek-entry")).toBeHidden();
      await page.getByTestId("table-peek").locator("summary").click();

      const entry = page.getByTestId("peek-entry").first();
      await expect(entry).toContainText("A crow lands on the signpost.");
      // The text is not in an input anybody can type into.
      await expect(entry.locator("input")).toHaveCount(0);
    });

    test("switches both ways", async ({ page }) => {
      await newTable(page, "Omens", "A crow lands on the signpost.");

      await page.getByTestId("source-mode-use").click();
      await expect(page.getByTestId("table-use-view")).toBeVisible();

      await page.getByTestId("source-mode-build").click();
      await expect(page.getByTestId("table-editor")).toBeVisible();
    });

    /**
     * Switching modes must not touch the URL: a URL change costs a webfont
     * request in this app, and rolling has to work offline (FR-020, SC-005).
     */
    test("switches modes without a single request leaving the machine", async ({
      page,
      context,
    }) => {
      await newTable(page, "Omens", "A crow lands on the signpost.");

      const offsite: string[] = [];
      page.on("request", (request) => {
        if (!request.url().startsWith("http://localhost:")) {
          offsite.push(request.url());
        }
      });

      await context.setOffline(true);
      await page.getByTestId("source-mode-use").click();
      await expect(page.getByTestId("table-use-view")).toBeVisible();
      await page.getByTestId("roll-table").click();
      await expect(page.getByTestId("roll-result")).toContainText("crow");
      await page.getByTestId("source-mode-build").click();
      await expect(page.getByTestId("table-editor")).toBeVisible();
      await context.setOffline(false);

      expect(offsite).toEqual([]);
    });

    // The URL is still honoured on arrival, so a link to a mode works.
    test("opens in the mode a link asks for", async ({ page }) => {
      await newTable(page, "Omens", "A crow lands on the signpost.");
      await expect(page.getByTestId("workspace-saving")).toBeHidden();

      await page.goto("/tables?mode=build");
      await page
        .getByTestId("table-list-item")
        .filter({ hasText: "Omens" })
        .click();

      await expect(page.getByTestId("table-editor")).toBeVisible();
    });

    // Storage carries the half of bookmarking that matters day to day.
    test("comes back in the mode it was left in", async ({ page }) => {
      await newTable(page, "Omens", "A crow lands on the signpost.");
      await page.getByTestId("source-mode-use").click();
      await expect(page.getByTestId("table-use-view")).toBeVisible();
      await expect(page.getByTestId("workspace-saving")).toBeHidden();

      await page.goto("/tables");
      await page
        .getByTestId("table-list-item")
        .filter({ hasText: "Omens" })
        .click();

      await expect(page.getByTestId("table-use-view")).toBeVisible();
      await expect(page.getByTestId("table-editor")).toBeHidden();
    });

    // Collapsing is a phone measure; a wide screen keeps the rail and never
    // shows the toggle at all.
    test("keeps the rail open on a wide screen", async ({ page }) => {
      await expect(page.getByTestId("toggle-source-list")).toBeHidden();

      await newTable(page, "Omens", "A crow lands on the signpost.");

      await expect(page.locator("#source-list")).toBeVisible();
      await expect(page.getByTestId("new-table")).toBeVisible();
      await expect(page.getByTestId("toggle-source-list")).toBeHidden();
    });

    // The whole point of the default: somebody who has never chosen a mode
    // opens a table to roll it, not to rewrite it.
    test("opens an existing table ready to roll for someone with no preference", async ({
      page,
    }) => {
      await newTable(page, "Omens", "A crow lands on the signpost.");
      await expect(page.getByTestId("workspace-saving")).toBeHidden();

      // Authoring stored "build"; forget it, as a first-time visitor would.
      await page.evaluate(() =>
        localStorage.removeItem("codex-random-source-mode"),
      );

      await page.goto("/tables");
      const item = page.getByTestId("table-list-item").filter({
        hasText: "Omens",
      });
      await expect(item).toBeVisible({ timeout: 30000 });
      await item.click();

      await expect(page.getByTestId("table-use-view")).toBeVisible();
      await expect(page.getByTestId("roll-table")).toBeVisible();
      await expect(page.getByTestId("table-editor")).toBeHidden();
    });
  });

  test.describe("decks", () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, "/decks");
      await expect(page.getByTestId("new-deck")).toBeVisible({
        timeout: 30000,
      });
    });

    test("the use view deals without letting the deck be rewritten", async ({
      page,
    }) => {
      await page.getByTestId("new-deck").click();
      await page.getByTestId("deck-name").fill("Omens");
      await page.getByTestId("deck-name").press("Enter");
      await page.getByTestId("add-card").click();
      await page.getByTestId("card-title").first().fill("Raven");

      await page.getByTestId("source-mode-use").click();
      await expect(page.getByTestId("deck-use-view")).toBeVisible();

      await expect(page.getByTestId("source-name")).toHaveText("Omens");
      await expect(page.getByTestId("add-card")).toBeHidden();
      await expect(page.getByTestId("add-spread")).toBeHidden();

      // Dealing still works, and still moves the card to the discard pile:
      // draw state is play, not definition.
      await page.getByTestId("draw-cards").click();
      await expect(page.getByTestId("drawn-title")).toHaveText("Raven");
      await expect(page.getByTestId("deck-discarded")).toHaveText("1");
    });
  });
  /**
   * On a phone the header and the list are both chrome, and between them they
   * were pushing the roll or the draw below the fold.
   */
  test.describe("phone layout", () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, "/tables", 360);
      await expect(page.getByTestId("toggle-source-list")).toBeVisible({
        timeout: 30000,
      });
    });

    test("keeps both toggles on one row", async ({ page }) => {
      const kinds = page.getByRole("navigation", {
        name: "Random source kind",
      });
      const modes = page.getByRole("navigation", { name: "Workspace mode" });

      const kindsBox = await kinds.boundingBox();
      const modesBox = await modes.boundingBox();

      expect(kindsBox).not.toBeNull();
      expect(modesBox).not.toBeNull();
      // Same row, and the pair fits inside the viewport.
      expect(Math.abs(kindsBox!.y - modesBox!.y)).toBeLessThan(2);
      expect(modesBox!.x + modesBox!.width).toBeLessThanOrEqual(360);
    });

    test("shows the list while nothing is open, and gets out of the way once something is", async ({
      page,
    }) => {
      const list = page.locator("#source-list");
      await expect(list).toBeVisible();

      await newTable(page, "Omens", "A crow lands on the signpost.");

      await expect(list).toBeHidden();
      await expect(page.getByTestId("toggle-source-list")).toContainText(
        "Omens",
      );
    });

    test("brings the list back on request", async ({ page }) => {
      await newTable(page, "Omens", "A crow lands on the signpost.");
      const list = page.locator("#source-list");
      await expect(list).toBeHidden();

      await page.getByTestId("toggle-source-list").click();

      await expect(list).toBeVisible();
      await expect(page.getByTestId("new-table")).toBeVisible();
      await expect(page.getByTestId("table-search")).toBeVisible();
    });
  });
});
