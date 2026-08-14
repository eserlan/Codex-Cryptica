import { test, expect, type Page } from "@playwright/test";

/**
 * Decks, their discard pile, and the fact it survives a reload (#2247, SC-007).
 *
 * Draw state lives beside the deck in the vault, so a reload has to find the
 * pile exactly as it was left — that is the whole point of storing it there.
 */

async function openDecks(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("codex_skip_landing", "true");
    localStorage.setItem("codex_guided_mode_active", "false");
    localStorage.setItem(
      "codex-cryptica-help-state",
      JSON.stringify({ completedTours: ["initial-onboarding"] }),
    );
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForFunction(() => (window as any).vault?.status === "idle");
  await page.goto("/decks");
  await expect(page.getByTestId("new-deck")).toBeVisible({ timeout: 30000 });
}

async function addCard(page: Page, index: number, title: string, body: string) {
  await page.getByTestId("add-card").click();
  await page.getByTestId("card-title").nth(index).fill(title);
  await page.getByTestId("card-body").fill(body);
}

test.describe("Card decks", () => {
  // These journeys touch the vault on disk and, on a cold dev server, wait on
  // first compiles: the default 30s is tight enough to fail on load alone.
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await openDecks(page);
  });

  test("keeps the discard pile across a reload, and reset restores it", async ({
    page,
  }) => {
    await page.getByTestId("new-deck").click();
    await page.getByTestId("deck-name").fill("Omens");
    await page.getByTestId("deck-name").press("Enter");

    for (const [index, title] of ["Raven", "Comet", "Flood"].entries()) {
      await addCard(
        page,
        index,
        title,
        `The ${title.toLowerCase()} means change.`,
      );
    }

    await expect(page.getByTestId("deck-remaining")).toHaveText("3");

    await page.getByTestId("draw-cards").click();
    await expect(page.getByTestId("drawn-card")).toHaveCount(1);
    await expect(page.getByTestId("deck-remaining")).toHaveText("2");
    await expect(page.getByTestId("deck-discarded")).toHaveText("1");

    const drawnTitle = await page.getByTestId("drawn-title").textContent();

    // A hard reload: the pile has to come back from the vault, not memory.
    await expect(page.getByTestId("workspace-saving")).toBeHidden();
    await page.reload();
    await page.getByTestId("deck-list-item").click();
    await expect(page.getByTestId("deck-remaining")).toHaveText("2");
    await expect(page.getByTestId("deck-discarded")).toHaveText("1");
    await expect(page.getByTestId("discarded-card")).toHaveText(
      drawnTitle?.trim() ?? "",
    );

    await page.getByTestId("reshuffle-deck").click();
    await expect(page.getByTestId("deck-remaining")).toHaveText("3");
    await expect(page.getByTestId("deck-discarded")).toHaveText("0");
  });

  test("draws offline and records the draw in roll history", async ({
    page,
    context,
  }) => {
    await page.getByTestId("new-deck").click();
    await page.getByTestId("deck-name").fill("Portents");
    await page.getByTestId("deck-name").press("Enter");
    await addCard(page, 0, "Eclipse", "A day without noon.");

    // The die roller is a lazily loaded chunk, and the dev server cannot serve
    // it while the page is offline. Loading it first keeps the test about the
    // draw rather than about module loading.
    await page.getByTestId("dice-roller-button").click();
    const modal = page.getByTestId("dice-modal");
    await expect(modal).toBeVisible({ timeout: 15000 });
    await modal.getByRole("button", { name: "Close", exact: true }).click();
    await expect(modal).toBeHidden();

    const offsite: string[] = [];
    page.on("request", (request) => {
      if (!request.url().startsWith("http://localhost:")) {
        offsite.push(request.url());
      }
    });

    await context.setOffline(true);
    await page.getByTestId("draw-cards").click();
    await expect(page.getByTestId("drawn-title")).toHaveText("Eclipse");
    await context.setOffline(false);
    expect(offsite).toEqual([]);

    await page.getByTestId("dice-roller-button").click();
    await expect(modal.getByTestId("roll-source-name").first()).toHaveText(
      "Portents",
    );
    await expect(modal.getByTestId("roll-source-text").first()).toContainText(
      "A day without noon.",
    );
  });

  test("offers a reshuffle when the deck runs out", async ({ page }) => {
    await page.getByTestId("new-deck").click();
    await page.getByTestId("deck-name").fill("Two cards");
    await page.getByTestId("deck-name").press("Enter");
    await addCard(page, 0, "First", "One.");
    await addCard(page, 1, "Second", "Two.");

    await page.getByTestId("draw-count").fill("2");
    await page.getByTestId("draw-cards").click();
    await expect(page.getByTestId("drawn-card")).toHaveCount(2);
    await expect(page.getByTestId("deck-remaining")).toHaveText("0");

    await page.getByTestId("draw-cards").click();
    await expect(page.getByTestId("deck-exhausted")).toBeVisible();

    await page.getByTestId("confirm-reshuffle").click();
    await expect(page.getByTestId("deck-remaining")).toHaveText("2");
  });

  test("deals a spread into named positions", async ({ page }) => {
    await page.getByTestId("new-deck").click();
    await page.getByTestId("deck-name").fill("Tarot");
    await page.getByTestId("deck-name").press("Enter");
    for (const [index, title] of ["Tower", "Star", "Moon"].entries()) {
      await addCard(page, index, title, `The ${title} speaks.`);
    }

    await page.getByTestId("add-spread").click();
    await page.getByTestId("spread-name").fill("Three fates");
    await page.getByTestId("spread-positions").fill("Past, Present, Future");

    await page.getByTestId("draw-spread").click();

    // A layout, not a list: every position is named beside its card (FR-028).
    await expect(page.getByTestId("spread-layout")).toBeVisible();
    await expect(page.getByTestId("drawn-card")).toHaveCount(3);
    await expect(page.getByTestId("drawn-position")).toHaveText([
      "Past",
      "Present",
      "Future",
    ]);
  });

  test("refuses to half-deal a spread the deck cannot fill", async ({
    page,
  }) => {
    await page.getByTestId("new-deck").click();
    await page.getByTestId("deck-name").fill("Thin deck");
    await page.getByTestId("deck-name").press("Enter");
    await addCard(page, 0, "Only", "The only card.");

    await page.getByTestId("add-spread").click();
    await page.getByTestId("spread-positions").fill("One, Two, Three");
    await page.getByTestId("draw-spread").click();

    await expect(page.getByTestId("deck-exhausted")).toBeVisible();
    await expect(page.getByTestId("drawn-card")).toHaveCount(0);
    await expect(page.getByTestId("deck-remaining")).toHaveText("1");
  });

  test("imports a pile of cards in one paste", async ({ page }) => {
    await page.getByTestId("open-import").click();
    await page.getByTestId("import-name").fill("Omen deck");
    await page
      .getByTestId("import-paste")
      .fill("The Tower\tSudden ruin.\nThe Star\tHope worth walking to.");

    await expect(page.getByTestId("import-summary")).toContainText("2 ready");
    await page.getByTestId("import-confirm").click();

    await expect(page.getByTestId("deck-editor")).toBeVisible();
    await expect(page.getByTestId("card-title").first()).toHaveValue(
      "The Tower",
    );
    await expect(page.getByTestId("card-title").nth(1)).toHaveValue("The Star");

    // The body came across too, not just the title.
    await page.getByTestId("toggle-card").first().click();
    await expect(page.getByTestId("card-body")).toHaveValue("Sudden ruin.");
  });
});
