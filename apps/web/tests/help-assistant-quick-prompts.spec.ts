import { expect, test, type Page } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

/**
 * Quick prompts (#3616): an empty Cif conversation offers a few verified
 * questions for the screen, and tapping one asks it. The model is stubbed.
 */
const answer = {
  outcome: "answered",
  answer: "Open the Status tab and choose Add under Connections.",
  sources: [
    {
      id: "connections-tab#0",
      title: "Connections Tab",
      helpId: "connections-tab",
    },
  ],
  action: null,
  suggestions: [],
};

test.describe("Help assistant: quick prompts", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("codex_help_assistant", "true"),
    );
    await setupVaultPage(page);
  });

  async function openOnConnections(page: Page) {
    await seedEntity(page, {
      type: "location",
      title: "Oakvale",
      select: true,
    });
    await page.getByTestId("tab-connections").click();
    await page.getByTestId("ask-about-this").click();
  }

  test("offers the Connections prompts and asks the one that is tapped", async ({
    page,
  }) => {
    let requestBody = "";
    await page.route("**/api/help/ask", async (route) => {
      requestBody = route.request().postData() ?? "";
      await route.fulfill({ json: answer });
    });
    await openOnConnections(page);

    const list = page.getByRole("list", { name: "Questions you can ask Cif" });
    await expect(list.getByRole("button")).toHaveText([
      "Where do I add a connection?",
      "How do I give a connection a label like rival?",
      "How do I generate entries related to this one?",
    ]);

    await list
      .getByRole("button", { name: "Where do I add a connection?" })
      .click();

    await expect(page.getByTestId("help-assistant-answer")).toContainText(
      "Status tab",
    );
    // Sent like any typed question: the text and a screen description only.
    expect(requestBody).toContain("Where do I add a connection?");
    expect(requestBody).not.toContain("Oakvale");
    // The prompts give way to the conversation, and focus is in the input.
    await expect(page.getByTestId("help-quick-prompts")).toHaveCount(0);
    await expect(
      page.getByLabel(/Ask Cif a question about using Codex Cryptica/i),
    ).toBeFocused();
  });

  test("does not ask anything until a prompt is tapped, and a prompt works offline like a typed question", async ({
    page,
    context,
  }) => {
    let asked = 0;
    await page.route("**/api/help/ask", async (route) => {
      asked += 1;
      await route.fulfill({ json: answer });
    });
    await openOnConnections(page);
    await expect(page.getByTestId("help-quick-prompts")).toBeVisible();
    expect(asked).toBe(0);

    await context.setOffline(true);
    await page
      .getByRole("button", { name: "Where do I add a connection?" })
      .click();

    await expect(page.getByText(/You're offline/)).toBeVisible({
      timeout: 3000,
    });
    expect(asked).toBe(0);
  });

  test("brings the prompts back after Start over", async ({ page }) => {
    await page.route("**/api/help/ask", (route) =>
      route.fulfill({ json: answer }),
    );
    await openOnConnections(page);
    await page
      .getByRole("button", { name: "Where do I add a connection?" })
      .click();
    await expect(page.getByTestId("help-assistant-answer")).toBeVisible();

    await page.getByRole("button", { name: "Start over" }).click();

    await expect(page.getByTestId("help-quick-prompts")).toBeVisible();
  });
});
