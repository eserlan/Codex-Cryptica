import { expect, type Page } from "@playwright/test";

type SeedEntityOptions = {
  type?: string;
  title: string;
  id?: string;
  content?: string;
  select?: boolean;
  waitForGraph?: boolean;
  data?: Record<string, unknown>;
};

/**
 * Seed real onboarding-complete state so tours/demo/landing don't auto-trigger.
 * Replaces the former `window.DISABLE_ONBOARDING` / `window.__E2E__` test globals
 * by writing the same persisted keys the app reads on boot:
 *  - codex_skip_landing -> onboarding store skips the landing page (so it boots)
 *  - codex-cryptica-help-state -> help store marks the onboarding tour as seen,
 *    which suppresses the auto tour/demo trigger
 * Pass to `page.addInitScript` so it runs before the app boots on every navigation.
 */
export function seedOnboardingComplete() {
  try {
    localStorage.setItem("codex_skip_landing", "true");
    localStorage.setItem(
      "codex-cryptica-help-state",
      JSON.stringify({ completedTours: ["initial-onboarding"] }),
    );
  } catch {
    /* ignore */
  }
}

/** Shared setup for vault E2E tests */
export async function setupVaultPage(page: Page) {
  await page.addInitScript(seedOnboardingComplete);

  await page.goto("/");
  // Wait for vault initialization (OPFS auto-load)
  await page.waitForFunction(
    () => {
      const status = (window as any).vault?.status;
      return status === "idle";
    },
    {
      timeout: 15000,
    },
  );
  await dismissFrontPage(page);
  await expect(page.getByTestId("graph-canvas")).toBeVisible({
    timeout: 10000,
  });
}

/** Force the workspace past any landing/world page via real onboarding state. */
export async function dismissFrontPage(page: Page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem("codex_skip_landing", "true");
    } catch {
      /* ignore */
    }

    const onboarding = (window as any).onboardingStore;
    if (onboarding) {
      onboarding.dismissedWorldPage = true;
      onboarding.dismissedLandingPage = true;
      onboarding.skipWelcomeScreen = true;
    }
    // Legacy uiStore proxy, if present
    const ui = (window as any).uiStore;
    if (ui) {
      ui.dismissedWorldPage = true;
      ui.dismissedLandingPage = true;
      ui.skipWelcomeScreen = true;
    }
  });
}

export async function waitForVaultReady(page: Page, timeout = 15000) {
  await page.waitForFunction(
    () => {
      const vault = (window as any).vault;
      return !!vault && vault.status === "idle";
    },
    undefined,
    { timeout },
  );
}

export async function waitForGraphReady(
  page: Page,
  options: { minNodes?: number; timeout?: number } = {},
) {
  const { minNodes = 0, timeout = 15000 } = options;

  await expect(page.getByTestId("graph-canvas")).toBeVisible({ timeout });
  await page.waitForFunction(
    (expectedNodeCount) => {
      const graph = (window as any).graph;
      if (!graph?.elements) return expectedNodeCount === 0;

      const nodes = graph.elements.filter((element: any) => {
        if (element.group === "nodes") return true;
        return typeof element?.data?.id === "string" && !element?.data?.source;
      });

      return nodes.length >= expectedNodeCount;
    },
    minNodes,
    { timeout },
  );
}

export async function seedEntity(page: Page, options: SeedEntityOptions) {
  const id = await page.evaluate(async (entityOptions) => {
    const vault = (window as any).vault;
    if (!vault) throw new Error("Vault store is not available");

    const initialData = {
      ...(entityOptions.id ? { id: entityOptions.id } : {}),
      ...(entityOptions.content ? { content: entityOptions.content } : {}),
      ...(entityOptions.data ?? {}),
    };

    const entityId = await vault.createEntity(
      entityOptions.type ?? "note",
      entityOptions.title,
      initialData,
    );

    if (entityOptions.select) {
      vault.selectedEntityId = entityId;
    }

    return entityId;
  }, options);

  await page.waitForFunction(
    (entityId) => !!(window as any).vault?.entities?.[entityId],
    id,
    { timeout: 10000 },
  );

  if (options.waitForGraph !== false) {
    await waitForGraphReady(page, { minNodes: 1 });
  }

  await dismissFrontPage(page);
  return id;
}

export async function seedEntities(page: Page, entities: SeedEntityOptions[]) {
  const ids: string[] = [];

  for (const entity of entities) {
    ids.push(await seedEntity(page, { ...entity, waitForGraph: false }));
  }

  await waitForGraphReady(page, { minNodes: ids.length });
  await dismissFrontPage(page);
  return ids;
}

/**
 * Open the Oracle sidebar via the activity bar. Uses a forced click so the
 * dev-only DebugConsole overlay (fixed, high z-index) can't intercept it.
 */
export async function openOracle(page: Page) {
  await dismissFrontPage(page);
  const panel = page.getByTestId("oracle-sidebar-panel");
  if (!(await panel.isVisible().catch(() => false))) {
    await page.getByTestId("activity-bar-oracle").click({ force: true });
  }
  await expect(panel).toBeVisible({ timeout: 10000 });
}

export async function openEntitySidepanel(page: Page, entityId: string) {
  await page.evaluate((id) => {
    const vault = (window as any).vault;
    if (!vault) throw new Error("Vault store is not available");
    vault.selectedEntityId = id;
  }, entityId);

  await page.waitForFunction(
    (id) => (window as any).vault?.selectedEntityId === id,
    entityId,
    { timeout: 10000 },
  );
}

export async function selectGraphNodesByTitle(page: Page, titles: string[]) {
  await page.waitForFunction(
    (expectedTitles) => {
      const cy = (window as any).cy;
      if (!cy) return false;

      return expectedTitles.every(
        (title: string) =>
          cy.nodes().filter((node: any) => node.data("label") === title)
            .length > 0,
      );
    },
    titles,
    { timeout: 10000 },
  );

  await page.evaluate((expectedTitles) => {
    const cy = (window as any).cy;
    cy.nodes().unselect();
    for (const title of expectedTitles) {
      cy.nodes()
        .filter((node: any) => node.data("label") === title)
        .select();
    }
  }, titles);
}

export async function openGraphContextMenuForTitle(page: Page, title: string) {
  await page.evaluate((nodeTitle) => {
    const cy = (window as any).cy;
    const node = cy
      .nodes()
      .filter((candidate: any) => candidate.data("label") === nodeTitle)[0];
    if (!node) throw new Error(`Graph node not found: ${nodeTitle}`);

    const renderedPosition = node.renderedPosition();
    node.trigger("cxttap", { renderedPosition });
  }, title);
}
