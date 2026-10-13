import { test, expect } from "@playwright/test";
import { openOracle, seedEntities, setupVaultPage } from "./test-helpers";

// Composer flow for Oracle @mentions, up to the point of sending. Sending
// calls the model, which these tests do not do.
test.describe("Oracle @mentions composer", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
    });
    await setupVaultPage(page);
    await seedEntities(page, [
      { title: "Elara Voss" },
      { title: "Royal Academy of Pagen" },
    ]);
    await expect(page.getByTestId("entity-count")).toHaveText(/2\s+NOTES/, {
      timeout: 20000,
    });
    await openOracle(page);
  });

  test("picks an entity with the keyboard, inserts it and shows the first-use hint once", async ({
    page,
  }) => {
    const input = page.getByTestId("oracle-input");
    await input.focus();
    await input.pressSequentially("Who is @ela");

    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByTestId("entity-mention-hint")).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("Who is @Elara Voss ");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    // The hint is remembered on this device, so it does not come back.
    // The dev-only Debug Log can overlap this button, so dispatch the click.
    await page
      .getByTestId("entity-mention-hint")
      .getByRole("button", { name: "Got it" })
      .dispatchEvent("click");
    await expect(page.getByTestId("entity-mention-hint")).toHaveCount(0);
    await input.focus();
    await input.pressSequentially("x @roy");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByTestId("entity-mention-hint")).toHaveCount(0);
  });

  test("Escape closes the picker and keeps the typed text", async ({
    page,
  }) => {
    const input = page.getByTestId("oracle-input");
    await input.focus();
    await input.pressSequentially("@ela");
    await expect(page.getByRole("listbox")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(input).toHaveValue("@ela");
  });

  test("a no-match name stays plain and never shows a picker row", async ({
    page,
  }) => {
    const input = page.getByTestId("oracle-input");
    await input.focus();
    await input.pressSequentially("@zzz");
    await expect(page.getByRole("option")).toHaveCount(0);
    await expect(
      page
        .getByTestId("entity-mention-picker")
        .getByText(/No entities match/)
        .first(),
    ).toBeVisible();
  });
});
