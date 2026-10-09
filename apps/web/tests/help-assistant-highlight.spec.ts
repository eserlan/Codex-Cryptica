import { expect, test } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

/**
 * The spike scenario (#3427): on a Settlement's Connections tab, ask how to
 * connect a faction, accept the guide, and see the Add control highlighted on
 * the Status tab, without anything in the vault changing. The model is
 * stubbed; the real Worker is covered by its own tests.
 */
const answer = {
  outcome: "answered",
  answer:
    "The Connections tab only shows connections. Open the Status tab, choose Add under Connections, and pick the faction.",
  sources: [
    {
      id: "connections-tab#0",
      title: "Connections Tab",
      helpId: "connections-tab",
    },
  ],
  action: {
    type: "openPanel",
    panel: "status-tab",
    label: "Open the Status tab",
    then: {
      type: "highlight",
      target: "add-connection-button",
      label: "Add a connection here",
    },
  },
  suggestions: [],
};

test.describe("Help assistant: guided highlight", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("codex_help_assistant", "true"),
    );
    await setupVaultPage(page);
  });

  test("opens Status, highlights Add, and changes nothing in the vault", async ({
    page,
  }) => {
    let requestBody = "";
    await page.route("**/api/help/ask", async (route) => {
      requestBody = route.request().postData() ?? "";
      await route.fulfill({ json: answer });
    });

    const placeId = await seedEntity(page, {
      type: "location",
      title: "Oakvale Secret Hideout",
      select: true,
    });
    await seedEntity(page, { type: "faction", title: "The Red Hand" });
    await page.evaluate(
      (id) => ((window as any).vault.selectedEntityId = id),
      placeId,
    );

    const connectionsBefore = await page.evaluate(
      (id) => (window as any).vault.entities[id].connections?.length ?? 0,
      placeId,
    );

    await page.getByTestId("tab-connections").click();
    await expect(page.getByTestId("tab-connections")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.getByTestId("ask-about-this").click();
    await page
      .getByLabel(/Ask Cif a question about using Codex Cryptica/i)
      .fill("How do I connect the faction I just created?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();

    await expect(page.getByTestId("help-assistant-answer")).toContainText(
      "Status tab",
    );
    await page.getByRole("button", { name: "Show me" }).click();

    // The panel steps aside, the Status tab opens, and Add is pointed at.
    await expect(page.getByTestId("tab-status")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByTestId("help-highlight")).toBeVisible();
    await expect(
      page.getByTestId("help-highlight").getByText("Add a connection here"),
    ).toBeVisible();
    // Not visual-only: the same thing is announced to assistive technology.
    await expect(
      page.getByRole("status").filter({ hasText: "highlighted" }),
    ).toContainText("Add a connection here highlighted");

    // What was sent: the question and a screen description, nothing from the vault.
    expect(requestBody).toContain(
      "How do I connect the faction I just created?",
    );
    expect(requestBody).not.toMatch(/Oakvale|Red Hand/);
    expect(requestBody).not.toContain(placeId);

    // Escape clears it.
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("help-highlight")).toHaveCount(0);

    // Nothing was created or changed.
    const connectionsAfter = await page.evaluate(
      (id) => (window as any).vault.entities[id].connections?.length ?? 0,
      placeId,
    );
    expect(connectionsAfter).toBe(connectionsBefore);
  });

  test("a guide that cannot run leaves the panel open and raises no error", async ({
    page,
  }) => {
    await page.route("**/api/help/ask", (route) =>
      route.fulfill({
        json: {
          ...answer,
          action: {
            type: "highlight",
            target: "add-connection-button",
            label: "Add a connection here",
          },
        },
      }),
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await seedEntity(page, {
      type: "location",
      title: "Elsewhere",
      select: true,
    });
    await page.getByTestId("tab-connections").click();
    await page.getByTestId("ask-about-this").click();
    await page
      .getByLabel(/Ask Cif a question about using Codex Cryptica/i)
      .fill("Where is Add?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.getByTestId("help-assistant-answer")).toBeVisible();

    // From the Connections tab a bare highlight of Add is not valid (the
    // button is on the Status tab), so no guide is even offered.
    await expect(page.getByRole("button", { name: "Show me" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
