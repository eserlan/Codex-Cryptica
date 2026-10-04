import { expect, test, type Page } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

/**
 * Open side panels (#3768): while the Explorer or the Shelf is open, Cif's
 * screen description says so. The model is stubbed.
 */
const answer = {
  outcome: "answered",
  answer: "Drag an entry onto another to nest it.",
  sources: [
    {
      id: "entity-explorer#0",
      title: "Entity Explorer",
      helpId: "entity-explorer",
    },
  ],
  action: null,
  suggestions: [],
};

type Sent = { context: { flags: string[]; area: string } };

test.describe("Help assistant: open side panels", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    await page.addInitScript(() =>
      localStorage.setItem("codex_help_assistant", "true"),
    );
    await setupVaultPage(page);
    await seedEntity(page, { type: "location", title: "Oakvale" });
  });

  async function openCif(page: Page) {
    await page.getByTestId("help-assistant-button").click();
    await expect(page.getByTestId("help-assistant-panel")).toBeVisible();
  }

  async function ask(page: Page, text: string) {
    await page
      .getByLabel(/Ask Cif a question about using Codex Cryptica/i)
      .fill(text);
    await page.getByRole("button", { name: "Ask", exact: true }).click();
  }

  test("says the Explorer is open, without changing the screen or sending a name", async ({
    page,
  }) => {
    const bodies: Sent[] = [];
    await page.route("**/api/help/ask", async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({ json: answer });
    });

    await page.getByTestId("activity-bar-explorer").click();
    await expect(page.getByTestId("entity-explorer-panel")).toBeVisible();
    await openCif(page);
    await ask(page, "How do I nest one entry inside another?");
    await expect(page.getByTestId("help-assistant-answer")).toContainText(
      "nest",
    );

    expect(bodies).toHaveLength(1);
    expect(bodies[0].context.flags).toContain("explorer-open");
    expect(bodies[0].context.flags).not.toContain("shelf-open");
    // The panel adds to the description: the screen behind it is still the graph.
    expect(bodies[0].context.area).toBe("graph");
    expect(JSON.stringify(bodies[0])).not.toContain("Oakvale");
  });

  test("sends no panel flag once the Explorer is closed", async ({ page }) => {
    const bodies: Sent[] = [];
    await page.route("**/api/help/ask", async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({ json: answer });
    });

    await page.getByTestId("activity-bar-explorer").click();
    await expect(page.getByTestId("entity-explorer-panel")).toBeVisible();
    await page.getByTestId("activity-bar-explorer").click();
    await expect(page.getByTestId("entity-explorer-panel")).toHaveCount(0);
    await openCif(page);
    await ask(page, "How do I connect two entries?");
    await expect(page.getByTestId("help-assistant-answer")).toBeVisible();

    expect(bodies[0].context.flags).not.toContain("explorer-open");
  });

  test("still answers when the service rejects the new flag, by retrying without it", async ({
    page,
  }) => {
    const bodies: Sent[] = [];
    await page.route("**/api/help/ask", async (route) => {
      const body = route.request().postDataJSON() as Sent;
      bodies.push(body);
      if (body.context.flags.includes("explorer-open")) {
        await route.fulfill({
          status: 400,
          json: { error: { code: "INVALID_CONTEXT" } },
        });
        return;
      }
      await route.fulfill({ json: answer });
    });

    await page.getByTestId("activity-bar-explorer").click();
    await expect(page.getByTestId("entity-explorer-panel")).toBeVisible();
    await openCif(page);
    await ask(page, "How do I nest one entry inside another?");

    await expect(page.getByTestId("help-assistant-answer")).toContainText(
      "nest",
    );
    expect(bodies).toHaveLength(2);
    expect(bodies[0].context.flags).toContain("explorer-open");
    expect(bodies[1].context.flags).not.toContain("explorer-open");
    // The person never sees an error message for the mismatch.
    await expect(page.getByText(/couldn't/i)).toHaveCount(0);
  });
});
