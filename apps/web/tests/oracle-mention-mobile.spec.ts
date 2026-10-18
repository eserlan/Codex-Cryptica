import { test, expect } from "@playwright/test";
import { openOracle, seedEntities, setupVaultPage } from "./test-helpers";

// A phone-sized viewport. Playwright cannot raise a real soft keyboard, so the
// check is that the picker and Send stay inside the visible area at 360 px wide
// and that rows are large enough to tap.
test.describe("Oracle @mentions on a phone", () => {
  test.use({ viewport: { width: 360, height: 640 } });

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

  test("the picker lists tappable rows inside the screen and Send stays visible", async ({
    page,
  }) => {
    const input = page.getByTestId("oracle-input");
    // The dev-only Debug Log can sit over the composer, so focus the field
    // directly rather than clicking it.
    await input.focus();
    await input.pressSequentially("@ela");

    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    const option = page.getByRole("option", { name: /Elara Voss/ });
    await expect(option).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const listBox = await listbox.boundingBox();
    expect(listBox).not.toBeNull();
    expect(listBox!.y).toBeGreaterThanOrEqual(0);
    expect(listBox!.y + listBox!.height).toBeLessThanOrEqual(viewport!.height);

    const rowBox = await option.boundingBox();
    expect(rowBox!.height).toBeGreaterThanOrEqual(48);

    const send = page.getByRole("button", { name: "Send Message" });
    await expect(send).toBeInViewport();
  });

  test("the list scrolls when more entities match than fit", async ({
    page,
  }) => {
    const input = page.getByTestId("oracle-input");
    await input.focus();
    await input.pressSequentially("@");

    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    const overflow = await listbox.evaluate(
      (el) => getComputedStyle(el).overflowY,
    );
    expect(overflow).toBe("auto");
  });
});
