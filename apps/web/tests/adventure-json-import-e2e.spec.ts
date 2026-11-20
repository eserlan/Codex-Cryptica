import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { setupVaultPage } from "./test-helpers";

const FIXTURE_PATH = resolve(
  process.cwd(),
  "../../fixtures/adventures/reference-one-shot/adventure.v1.json",
);
const REFERENCE_PKG = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as {
  id: string;
  version: string;
  title: string;
  secrets: Array<{ id: string; text: string }>;
};

const SECRET_SNIPPETS = [
  "Tobiah wants the mill to fail",
  "Aldous hid in the cellar",
  "Wick is owed three months",
];

function mockTurnResponse(turnIndex: number) {
  const isOpening = turnIndex === 0;
  return {
    kind: "complete",
    narration: isOpening
      ? "Rain lashes the ferry landing by the mill stream. A lantern swings near the gate."
      : "You step into the muddy mill yard as the waterwheel groans overhead.",
    visiblePatch: {
      ...(isOpening ? {} : { packageSceneId: "ros-scene-2-yard" }),
      objectives: { add: [], update: [], removeIds: [] },
      activeCharacters: { add: [], update: [], removeIds: [] },
      knownFacts: { add: [], update: [], removeIds: [] },
      relationships: { add: [], update: [], removeIds: [] },
    },
    hiddenPatch: {
      secrets: { add: [], update: [], removeIds: [] },
      gmThreads: { add: [], update: [], removeIds: [] },
    },
    revealSecretIds: [],
    provisionalFacts: [],
    sourceRecordIds: [],
    revealScenarioIds: [],
    elaborateScenarios: [],
    suggestedActions: [
      "Inspect the ferry mooring",
      "Cross into the mill yard",
      "Call out toward the gate",
    ],
  };
}

const ORACLE_PROXY =
  /^https?:\/\/(?:localhost:8787|oracle-proxy\.espen-erlandsen\.workers\.dev)(?:\/|$)/;

test.describe("Imported Adventure JSON (v1) E2E (#4983, protocol §5)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    let callCount = 0;
    const fulfillTurn = async (route: import("@playwright/test").Route) => {
      const idx = callCount++;
      const text = JSON.stringify(mockTurnResponse(idx));
      let postData: Record<string, unknown> | null;
      try {
        postData = route.request().postDataJSON() as Record<string, unknown>;
      } catch {
        postData = null;
      }

      if (postData?.stream === true) {
        const sseBody =
          `data: ${JSON.stringify({ type: "started" })}\n\n` +
          `data: ${JSON.stringify({ type: "complete", id: `int-${idx}`, text })}\n\n`;
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream; charset=utf-8",
          body: sseBody,
        });
        return;
      }

      if (postData && "input" in postData) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: `int-${idx}`, text }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text }],
              },
            },
          ],
        }),
      });
    };

    await page.route(ORACLE_PROXY, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/session") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: "e2e-session-token",
            expiresAt: Date.now() + 3600_000,
          }),
        });
        return;
      }
      await fulfillTurn(route);
    });

    await page.route("**/v1beta/models/**", async (route) => {
      const url = route.request().url();
      if (!url.includes("generateContent")) {
        await route.continue();
        return;
      }
      await fulfillTurn(route);
    });

    await page.addInitScript(() => {
      (
        window as unknown as { __SHARED_GEMINI_KEY__?: string }
      ).__SHARED_GEMINI_KEY__ = "mock-api-key";
    });

    await setupVaultPage(page);
    await page.evaluate(async () => {
      const oracle = (
        window as unknown as {
          oracle?: {
            settingsManager?: {
              updateSettings?: (s: Record<string, unknown>) => Promise<void>;
            };
          };
        }
      ).oracle;
      await oracle?.settingsManager?.updateSettings?.({
        apiKey: "mock-api-key",
        connectionMode: "personal-key",
      });
    });
    await page.goto("/adventure#import-adventure-json");
    await page.getByTestId("adventure-json-dropzone").waitFor({
      state: "visible",
    });
  });

  test("imports, deduplicates, diffs versions, starts from reactive state, survives reload, and guards GM secrets", async ({
    page,
  }) => {
    const fileInput = page.getByTestId("adventure-file-input");

    // 1. Import reference-one-shot Adventure JSON v1
    await fileInput.setInputFiles(FIXTURE_PATH);
    const review = page.getByTestId("adventure-import-review");
    await expect(review).toBeVisible();
    await expect(review).toContainText(REFERENCE_PKG.title);
    await expect(review).toContainText("GM-only (locked)");

    await page.getByTestId("adventure-approve-button").click();
    await expect(
      page.getByTestId("adventure-approved-confirmation"),
    ).toBeVisible();
    await page.getByTestId("adventure-cancel-button").click();
    const approvedList = page.getByTestId("approved-adventure-packages");
    await expect(approvedList).toContainText(REFERENCE_PKG.title);
    for (const secret of SECRET_SNIPPETS) {
      await expect(approvedList).not.toContainText(secret);
    }

    // 2. Re-import exact same file -> deduplicated immediately without opening review
    await fileInput.setInputFiles(FIXTURE_PATH);
    await expect(page.getByText(/already imported/i)).toBeVisible();
    await expect(page.getByTestId("adventure-import-review")).toHaveCount(0);
    const group = page.getByTestId(
      `approved-package-group-${REFERENCE_PKG.id}`,
    );
    await expect(
      group.locator('[data-testid^="approved-package-start-the-last-grind-"]'),
    ).toHaveCount(1);

    // 3. Import modified version (1.1.0) -> shows diff, allows removing unused 1.1.0
    const updatedPkg = {
      ...REFERENCE_PKG,
      version: "1.1.0",
      description: `${REFERENCE_PKG.title} revised edition.`,
    };
    await fileInput.setInputFiles({
      name: "adventure.v1.1.0.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(updatedPkg), "utf8"),
    });
    await expect(page.getByTestId("adventure-import-review")).toBeVisible();
    await page.getByTestId("adventure-approve-button").click();
    await expect(
      page.getByTestId("adventure-approved-confirmation"),
    ).toBeVisible();
    await page.getByTestId("adventure-cancel-button").click();
    await expect(
      group.locator('[data-testid^="approved-package-start-the-last-grind-"]'),
    ).toHaveCount(2);

    const removeButtons = group.locator(
      '[data-testid^="approved-package-remove-the-last-grind-"]',
    );
    await removeButtons.last().click();
    await expect(
      group.locator('[data-testid^="approved-package-start-the-last-grind-"]'),
    ).toHaveCount(1);

    // 4. Start the approved 1.0.0 package
    await group
      .locator('[data-testid^="approved-package-start-the-last-grind-"]')
      .first()
      .click();
    await expect(page.getByTestId("adventure-pinned-package")).toBeVisible();

    await page.getByLabel("Player character").fill("Mara");
    await page.getByLabel(/Character description/i).fill("River courier");
    await page.getByRole("button", { name: "Start adventure" }).click();

    const narrative = page.getByTestId("adventure-narrative");
    await expect(
      narrative.getByText("Rain lashes the ferry landing by the mill stream."),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Adventure tools" }).click();
    await expect(page.getByTestId("adventure-package-progress")).toBeVisible();
    await page.keyboard.press("Escape");

    // 5. Submit an action that moves scenes, then reload and verify persistence + secrecy
    const actionInput = page.getByRole("textbox", {
      name: /what do you do|action/i,
    });
    await actionInput.fill("Cross into the mill yard");
    await page.getByRole("button", { name: /send|act|submit/i }).click();
    await expect(
      narrative.getByText("You step into the muddy mill yard"),
    ).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(
      narrative.getByText("You step into the muddy mill yard"),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Adventure tools" }).click();
    await expect(page.getByTestId("adventure-package-progress")).toBeVisible();

    const bodyText = await page.locator("main").first().innerText();
    for (const secret of SECRET_SNIPPETS) {
      expect(bodyText).not.toContain(secret);
    }
  });
});
