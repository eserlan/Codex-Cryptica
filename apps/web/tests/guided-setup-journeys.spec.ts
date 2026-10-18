import { test, expect, type Page } from "@playwright/test";

/**
 * Guided setup journeys (spec 175). Each test starts on an empty vault and
 * completes steps through the same create and connect paths a user takes.
 */

const AI_HOSTS = /\/api\/help\/|generativelanguage|\/api\/oracle/;

async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("codex_skip_landing", "true");
    localStorage.setItem("codex_guided_mode_active", "false");
    localStorage.removeItem("codex-cryptica-help-state");
  });
}

async function waitForVaultReady(page: Page) {
  await page.waitForFunction(
    () => {
      const v = (window as any).vault;
      return v && v.isInitialized && v.status === "idle";
    },
    { timeout: 60_000 },
  );
}

async function createEntry(page: Page, type: string, title: string) {
  return page.evaluate(
    ([t, n]) =>
      (window as any).vault.createEntity(t, n).then((e: any) => e?.id ?? e),
    [type, title] as const,
  );
}

async function connect(page: Page, a: string, b: string) {
  await page.evaluate(
    ([s, t]) => (window as any).vault.addConnection(s, t, "related"),
    [a, b] as const,
  );
}

async function entityCount(page: Page) {
  return page.evaluate(() => (window as any).vault.allEntities.length);
}

test.describe("Guided setup journeys", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test("Build a world: create a place and a character, connect them, open the Graph", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForVaultReady(page);
    await page.getByTestId("goal-invitation-world").click();
    await expect(page.getByTestId("journey-card")).toBeVisible();
    await expect(page.getByTestId("journey-step-instruction")).toContainText(
      "place",
    );

    const place = await createEntry(page, "location", "Harrowmere");
    await expect(page.getByTestId("journey-step-instruction")).toContainText(
      "character",
    );
    const hero = await createEntry(page, "character", "Mira");
    // The app opens on the Graph, so the Graph step completes once the
    // connection exists (research R3).
    await connect(page, hero, place);
    await expect(page.getByTestId("journey-finish")).toBeVisible({
      timeout: 15_000,
    });
    // Guidance never changes the vault: exactly what the test created.
    expect(await entityCount(page)).toBe(2);
  });

  test("Explore on my own: no journey starts, the tour is only offered", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForVaultReady(page);
    await page.getByTestId("goal-invitation-explore").click();
    await expect(page.getByTestId("journey-card")).toHaveCount(0);
    await expect(page.getByTestId("goal-invitation-tour")).toBeVisible();
    await page.getByTestId("goal-invitation-no-thanks").click();
    await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  });

  test("closing the invitation does not bring it back after reload", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForVaultReady(page);
    await page.getByTestId("goal-invitation-close").click();
    await page.reload();
    await waitForVaultReady(page);
    await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  });

  test("sends no AI request while the invitation, goals and steps run", async ({
    page,
  }) => {
    const aiRequests: string[] = [];
    await page.route(AI_HOSTS, (route) => {
      aiRequests.push(route.request().url());
      return route.fulfill({ status: 503, body: "{}" });
    });
    await page.goto("/");
    await waitForVaultReady(page);
    await page.getByTestId("goal-invitation-campaign").click();
    await expect(page.getByTestId("journey-card")).toBeVisible();
    await page.getByTestId("journey-skip").click();
    await page.getByTestId("journey-exit").click();
    expect(aiRequests).toEqual([]);
  });

  test("the card comes back after a reload in the same session", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForVaultReady(page);
    await page.getByTestId("goal-invitation-story").click();
    await expect(page.getByTestId("journey-card")).toBeVisible();
    await page.reload();
    await waitForVaultReady(page);
    await expect(page.getByTestId("journey-card")).toBeVisible();
  });

  test("the card does not come back by itself in a new browser session", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForVaultReady(page);
    await page.getByTestId("goal-invitation-story").click();
    await expect(page.getByTestId("journey-card")).toBeVisible();
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await waitForVaultReady(page);
    await expect(page.getByTestId("journey-card")).toHaveCount(0);
    const stored = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) =>
        k.startsWith("codex-onboarding-journey:"),
      ),
    );
    expect(stored.length).toBe(1);
  });

  test("phone: the card is a bottom sheet and the invitation is usable with touch", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await waitForVaultReady(page);
    await page.getByTestId("goal-invitation-world").click();
    const card = page.getByTestId("journey-card");
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    const next = await page.getByTestId("journey-skip").boundingBox();
    expect(next!.height).toBeGreaterThanOrEqual(44);
  });

  test("stored progress holds only step ids and flags, never entry names", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForVaultReady(page);
    await page.getByTestId("goal-invitation-world").click();
    await createEntry(page, "location", "Secret Keep");
    const raw = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        k.startsWith("codex-onboarding-journey:"),
      );
      return key ? localStorage.getItem(key) : null;
    });
    expect(raw).not.toBeNull();
    expect(raw).not.toContain("Secret Keep");
    expect(Object.keys(JSON.parse(raw!)).sort()).toEqual(
      [
        "completed",
        "journeyId",
        "journeyVersion",
        "outcome",
        "schema",
        "skipped",
        "startedAt",
        "viewing",
      ].sort(),
    );
  });
});
