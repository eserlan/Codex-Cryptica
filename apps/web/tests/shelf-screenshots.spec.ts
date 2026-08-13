import { test, expect } from "@playwright/test";

/**
 * Not a test — a capture script for the blog article's screenshots.
 *
 * Kept in tests/ because it needs the same dev-server harness and vault
 * bootstrapping every e2e spec uses. Run explicitly:
 *
 *   npx playwright test tests/shelf-screenshots.spec.ts
 *
 * Output lands in output/shelf/ for upload to R2.
 */

const SHELF_MODULE_PATH = ["/src/lib/features/shelf", "index.ts"].join("/");
const MODAL_MODULE_PATH = ["/src/lib/stores/ui", "modal-ui.svelte.ts"].join(
  "/",
);
const OUT = "../../output/shelf";

async function waitForVaultReady(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => (window as any).vault?.isInitialized === true,
    {
      timeout: 30000,
    },
  );
}

/**
 * Creating a vault opens a "Choose Vault Theme" modal over everything. It has
 * to go before any screenshot, and before any click that would otherwise land
 * on the backdrop.
 */
/**
 * Creating a vault opens a "Choose Vault Theme" modal over everything.
 *
 * Closed through the store rather than by clicking: it can reopen on the next
 * vault creation, and chasing it with clicks means racing whichever first-run
 * modal happens to be on top. A real user's established vault shows none of
 * these — they are an artefact of building vaults from scratch in a harness.
 */
async function dismissVaultTheme(page: import("@playwright/test").Page) {
  await page.evaluate(async (modulePath) => {
    const module = await import(/* @vite-ignore */ modulePath);
    module.modalUIStore?.closeVaultThemePrompt?.();
  }, MODAL_MODULE_PATH);
  await page.waitForTimeout(300);
}

/**
 * The theme prompt re-opens on its own once a vault holds three entities
 * (VaultThemePromptStore.shouldAutoPrompt), which is exactly the state these
 * screenshots need — so closing it after the fact loses the race and the modal
 * lands on top of the Shelf. Recording it as already dismissed for the vault,
 * before the app ever loads that vault's record, keeps it away for good.
 */
async function suppressVaultThemePrompt(
  page: import("@playwright/test").Page,
  vaultId: string,
) {
  await page.evaluate((id) => {
    localStorage.setItem(
      `codex_vault_theme_prompt_${id}`,
      JSON.stringify({ status: "dismissed", activeMs: 0 }),
    );
    // The store caches each vault's record in memory the first time it reads
    // it, so a vault it has already seen ignores the line above. Its singleton
    // hangs off globalThis; mark the record dismissed there too.
    (globalThis as any).__codex_vault_theme_prompt_store__?.markDismissed?.(id);
  }, vaultId);
}

async function waitForVaultIdle(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => (window as any).vault?.status === "idle", {
    timeout: 30000,
  });
}

test("capture Shelf screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("codex_skip_landing", "true");
    // Guided Mode simplifies the interface and hides the activity bar, so the
    // Shelf has no visible entry point in it. Full Toolbox is what a screenshot
    // of the feature needs to show.
    localStorage.setItem("codex_guided_mode_active", "false");
    localStorage.setItem(
      "codex-cryptica-help-state",
      JSON.stringify({
        completedTours: ["initial-onboarding"],
        // The hint repeats the panel's own header copy, which reads as
        // duplication in a still image even though it is fine in use.
        dismissedHints: ["entity-shelf"],
      }),
    );
  });

  await page.goto("/");
  await waitForVaultReady(page);

  // --- A source campaign with a few things worth reusing -------------------

  const sourceId = await page.evaluate(
    async () => await (window as any).vault.createVault("Ashfall Reach"),
  );
  await suppressVaultThemePrompt(page, sourceId);
  await page.evaluate(
    async (id) => await (window as any).vault.switchVault(id),
    sourceId,
  );
  await waitForVaultIdle(page);
  await dismissVaultTheme(page);

  await page.evaluate(async () => {
    const vault = (window as any).vault;
    await vault.createEntity("creature", "Cinder Hound", {
      content: "It smells of hot iron long before you see it.",
      lore: "Bred in the forge-pits beneath the old smeltery.",
      labels: ["hostile", "fire"],
      statSheet: {
        templateId: null,
        fields: [
          { id: "hp", label: "HP", type: "number", value: 22 },
          { id: "ac", label: "AC", type: "number", value: 14 },
          { id: "speed", label: "Speed", type: "number", value: 40 },
        ],
      },
    });
    await vault.createEntity("character", "Vessa Quill", {
      content: "Archivist of the Reach. Knows which records were burned.",
      labels: ["ally"],
    });
    await vault.createEntity("item", "Woolly Socks +1", {
      content: "Unreasonably comfortable. Slightly singed.",
      labels: ["minor magic"],
    });
  });
  await waitForVaultIdle(page);

  await page.evaluate(async (modulePath) => {
    const module = await import(/* @vite-ignore */ modulePath);
    const vault = (window as any).vault;
    const ids = Object.values(vault.entities).map((e: any) => e.id);
    await module.shelf.shelve(ids, vault.vaultName);
    await module.shelf.refresh();
  }, SHELF_MODULE_PATH);

  // --- A second campaign, where they are about to be reused ----------------

  const targetId = await page.evaluate(
    async () => await (window as any).vault.createVault("The Long Winter"),
  );
  await suppressVaultThemePrompt(page, targetId);
  await page.evaluate(
    async (id) => await (window as any).vault.switchVault(id),
    targetId,
  );
  await waitForVaultIdle(page);
  await dismissVaultTheme(page);

  // A destination that already has a campaign in it, so the screenshot shows
  // the Shelf being used rather than an empty-vault onboarding panel.
  await page.evaluate(async () => {
    const vault = (window as any).vault;
    const hollowmere = await vault.createEntity("location", "Hollowmere", {
      content: "A lake town that freezes from the middle outwards.",
    });
    const alder = await vault.createEntity("character", "Sister Alder", {
      content: "Keeps the winter chapel. Counts the days out loud.",
    });
    const wardens = await vault.createEntity("faction", "The Thaw Wardens", {
      content: "They break the ice where it needs breaking.",
    });

    // Connected, so the canvas beside the Shelf reads as a campaign in progress
    // rather than three unrelated circles.
    const id = (created: any) =>
      typeof created === "string" ? created : created?.id;
    await vault.addConnection(
      id(alder),
      id(hollowmere),
      "related",
      "keeps the chapel",
    );
    await vault.addConnection(
      id(wardens),
      id(hollowmere),
      "related",
      "patrols the ice",
    );
    await vault.addConnection(
      id(alder),
      id(wardens),
      "related",
      "counts for them",
    );
  });
  await waitForVaultIdle(page);
  // Three entities is the threshold that makes the prompt auto-open, so re-mark
  // it now that the destination has crossed it.
  await suppressVaultThemePrompt(page, targetId);
  await dismissVaultTheme(page);

  await page.evaluate(() => {
    (window as any).layoutUIStore?.toggleSidebarTool?.("shelf");
    // Dev-only overlay; not part of the product.
    document
      .querySelectorAll<HTMLElement>("[data-testid*='debug'], .debug-console")
      .forEach((el) => (el.style.display = "none"));
  });

  const panel = page.getByTestId("shelf-panel");
  await expect(panel).toBeVisible({ timeout: 15000 });
  // DebugConsole renders only when logs exist and carries no testid or
  // distinguishing class — it is matched by its fixed position and z-index.
  await page.addStyleTag({
    content: ".fixed.z-\\[9999\\]{display:none !important}",
  });
  await page.waitForTimeout(600);

  // A new vault opens on the front page, whose empty world-image and
  // relevant-entities cards make the app look unfinished in a still. Dismiss
  // it so the graph — with this campaign actually in it — is what shows.
  await dismissVaultTheme(page);
  await page
    .getByTestId("front-page-shell")
    .locator("button[aria-label*='Close' i]")
    .first()
    .click({ timeout: 4000 })
    .catch(() => {});
  await page.waitForTimeout(1200);

  // Entities created through the vault API while the graph is already mounted
  // do not reach its layout, so the canvas beside the Shelf renders empty.
  // Redraw builds it from the current vault, then fit brings it into frame.
  await page.getByRole("button", { name: "Redraw Layout" }).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Fit to Screen" }).click();
  await page.waitForTimeout(1000);
  // Fit alone lands around 5x on a graph this small — nodes fill the canvas as
  // featureless blobs. Back off to a zoom where they read as a graph.
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Zoom Out" }).click();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1000);

  // 1: the Shelf open beside the destination campaign
  await page.screenshot({ path: `${OUT}/shelf-in-context.png` });
  await panel.screenshot({ path: `${OUT}/shelf-panel.png` });

  // 2: the import outcome, including a reconnected-links report
  await page.getByTestId("shelf-entry").first().getByRole("checkbox").check();
  await page.getByTestId("shelf-import").click();
  await expect(page.getByTestId("import-outcome")).toBeVisible({
    timeout: 15000,
  });
  await page.waitForTimeout(400);
  await panel.screenshot({ path: `${OUT}/shelf-import-outcome.png` });
  // The same moment at desktop width: the outcome report in the panel with the
  // campaign it just imported into still on screen. The import re-frames the
  // graph on the new node, so re-fit before shooting.
  await page.getByRole("button", { name: "Fit to Screen" }).click();
  await page.waitForTimeout(1000);
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Zoom Out" }).click();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/shelf-import-outcome-full.png` });

  console.log("SHOTS WRITTEN");
});
