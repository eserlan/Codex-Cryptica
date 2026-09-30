import { expect, test } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

/**
 * Offline or unreachable: the user gets a plain message and the static help
 * for the screen, and nothing else in the app is blocked (#3427, SC-005/008).
 */
test.describe("Help assistant: offline and failure", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("codex_help_assistant", "true"),
    );
    await setupVaultPage(page);
  });

  async function openHelpOnConnections(page: import("@playwright/test").Page) {
    await seedEntity(page, {
      type: "location",
      title: "Oakvale",
      select: true,
    });
    await page.getByTestId("tab-connections").click();
    await page.getByTestId("ask-about-this").click();
  }

  async function ask(page: import("@playwright/test").Page, question: string) {
    await page
      .getByLabel(/Ask a question about using Codex Cryptica/i)
      .fill(question);
    await page.getByRole("button", { name: "Ask", exact: true }).click();
  }

  test("offline: a plain message and a link to the Connections help, quickly", async ({
    page,
    context,
  }) => {
    await openHelpOnConnections(page);
    await context.setOffline(true);

    const started = Date.now();
    await ask(page, "How do I connect the faction?");
    await expect(page.getByText(/You're offline/)).toBeVisible({
      timeout: 2000,
    });
    expect(Date.now() - started).toBeLessThan(2500);
    await expect(
      page.getByRole("button", { name: "Connections Tab" }),
    ).toBeVisible();
  });

  test("a failing service gets the same static help", async ({ page }) => {
    await page.route("**/api/help/ask", (route) =>
      route.fulfill({
        status: 502,
        json: { error: { code: "UPSTREAM_ERROR" } },
      }),
    );
    await openHelpOnConnections(page);
    await ask(page, "How do I connect the faction?");
    await expect(
      page.getByText(/couldn't reach the help assistant/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Connections Tab" }),
    ).toBeVisible();
  });

  test("editing and navigating stay responsive while help is stuck", async ({
    page,
  }) => {
    await page.route("**/api/help/ask", () => new Promise(() => {}));
    await openHelpOnConnections(page);
    await ask(page, "This will hang");
    await expect(page.getByText("Looking that up…")).toBeVisible();

    // Other work carries on: switch tabs and change the selection while help waits.
    await page.getByTestId("tab-status").click({ force: true });
    await expect(page.getByTestId("tab-status")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.getByTestId("tab-connections").click({ force: true });
    await expect(page.getByTestId("tab-connections")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // And it can be cancelled.
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Looking that up…")).toHaveCount(0);
  });
});
