import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The public Idea Developer (#3228). Pins what a visitor must see before they
 * type anything: the page claims its own URL, the provider-held-conversation
 * notice sits beside the submit button (FR-038, SC-021), and the page passes an
 * accessibility scan. The AI call itself is covered by unit and component
 * tests; nothing here talks to a model.
 */

const PATH = "/tools/idea-developer";

/** Opens the page and waits until it has settled, so scans and typing act on the final page. */
async function open(page: Page, path = PATH) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/**
 * Types into the idea box. Text typed before the page finishes hydrating is
 * replaced when it does, so retry until the tool has taken the text.
 */
async function typeIdea(page: Page, text: string) {
  const box = page.getByRole("textbox", { name: /your rpg idea/i });
  const submit = page.getByRole("button", { name: /develop my idea/i });
  await expect(async () => {
    await box.fill(text);
    await expect(submit).toBeEnabled({ timeout: 2_000 });
  }).toPass({ timeout: 25_000 });
}

test.describe("Idea Developer", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });
  });

  test("is linked from the tools index and the link works", async ({
    page,
  }) => {
    await open(page, "/tools");
    const link = page.getByRole("link", { name: /idea developer/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /\/tools\/idea-developer$/);
    await link.click();
    await expect(page).toHaveURL(/\/tools\/idea-developer$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /develop your rpg idea/i }),
    ).toBeVisible();
  });

  test("loads with its own title and canonical", async ({ page }) => {
    await open(page);
    await expect(page).toHaveTitle(/Idea Developer/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://codexcryptica.com/tools/idea-developer",
    );
    await expect(
      page.getByRole("heading", { level: 1, name: /develop your rpg idea/i }),
    ).toBeVisible();
  });

  test("shows the notice beside the submit button before anything is typed", async ({
    page,
  }) => {
    await open(page);
    const area = page.getByTestId("submit-area");
    await expect(area).toBeVisible();
    await expect(
      area.getByRole("button", { name: /develop my idea/i }),
    ).toBeVisible();
    await expect(area.getByTestId("conversation-notice")).toBeVisible();
    await expect(area.getByTestId("conversation-notice")).toContainText(
      /sent to an AI service/i,
    );
    await expect(area.getByTestId("conversation-notice")).toContainText(
      /Codex Cryptica does not keep it/i,
    );
  });

  test("keeps submit disabled until there is an idea, and shows the length limit", async ({
    page,
  }) => {
    await page.goto(PATH);
    const submit = page.getByRole("button", { name: /develop my idea/i });
    await expect(submit).toBeDisabled();
    await typeIdea(page, "A haunted ferry.");
    await expect(submit).toBeEnabled();
    await expect(page.getByText(/\/ 4000/)).toBeVisible();
  });

  test("offers only the modes that exist", async ({ page }) => {
    await open(page);
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(2);
    await expect(page.getByRole("radio", { name: /assess/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /develop/i })).toBeChecked();
  });

  test("preselects the suggested mode when arriving from an answer link", async ({
    page,
  }) => {
    await open(
      page,
      `${PATH}?from=answer&source=is-my-rpg-campaign-idea-good&mode=assess`,
    );
    await expect(page.getByRole("radio", { name: /assess/i })).toBeChecked();
    await expect(
      page.getByRole("textbox", { name: /your rpg idea/i }),
    ).toBeFocused();
  });

  test("ignores a mode it does not know", async ({ page }) => {
    await open(page, `${PATH}?from=answer&source=abc&mode=challenge`);
    await expect(page.getByRole("radio", { name: /develop/i })).toBeChecked();
  });

  for (const theme of [
    { name: "the default theme", storage: {} },
    {
      name: "the dark fantasy theme",
      storage: {
        "codex-cryptica-active-theme": "fantasy",
        "codex-cryptica-app-appearance": "neutral-dark",
      },
    },
  ]) {
    test(`passes an accessibility scan in ${theme.name}`, async ({ page }) => {
      await page.addInitScript((entries) => {
        try {
          for (const [k, v] of Object.entries(entries))
            localStorage.setItem(k, v);
        } catch {
          /* ignore */
        }
      }, theme.storage);
      await open(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("can be used with the keyboard alone", async ({ page }) => {
    await open(page);
    await typeIdea(page, "A haunted ferry.");
    const box = page.getByRole("textbox", { name: /your rpg idea/i });
    await box.focus();
    // A radio group is one tab stop, on the checked radio.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("radio", { checked: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: /develop my idea/i }),
    ).toBeFocused();
  });
});
