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

  test("shows the notice at the bottom of the page, visible without opening anything", async ({
    page,
  }) => {
    await open(page);
    const notice = page.getByTestId("conversation-notice");
    await notice.scrollIntoViewIfNeeded();
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/sent to an AI service/i);
    await expect(notice).toContainText(/Codex Cryptica does not keep it/i);
    // It sits below the tool, not beside the submit button.
    const submit = await page
      .getByRole("button", { name: /develop my idea/i })
      .boundingBox();
    const box = await notice.boundingBox();
    expect(box!.y).toBeGreaterThan(submit!.y + submit!.height);
  });

  test("is readable on a phone: text of at least 14px, inputs of at least 16px, tall buttons", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    const measured = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const small: string[] = [];
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim();
        const el = node.parentElement;
        if (!text || !el) continue;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const px = parseFloat(style.fontSize);
        if (px < 14) small.push(`${px}px: ${text.slice(0, 40)}`);
      }
      const area = document.querySelector("textarea")!;
      const buttons = [...main.querySelectorAll("button")].map((b) =>
        Math.round(b.getBoundingClientRect().height),
      );
      return {
        small,
        textarea: parseFloat(getComputedStyle(area).fontSize),
        shortest: Math.min(...buttons),
      };
    });
    expect(measured.small).toEqual([]);
    expect(measured.textarea).toBeGreaterThanOrEqual(16);
    expect(measured.shortest).toBeGreaterThanOrEqual(44);
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
