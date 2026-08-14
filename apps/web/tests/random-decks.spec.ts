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
    const modal = page.getByTestId("dice-modal");
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
});
