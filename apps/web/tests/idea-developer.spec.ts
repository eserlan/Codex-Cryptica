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

  const PHONE = { width: 390, height: 844 };

  /** Sizes of every visible piece of text, the text areas, and the buttons. */
  async function measure(page: Page) {
    return page.evaluate(() => {
      // The quiet notice, form labels and small-caps eyebrows are chrome: held
      // to the 16px floor, not the 18px reading size.
      const CHROME =
        '[data-testid="conversation-notice"], label, legend, [class*="uppercase"]';

      function visibleText(root: Element): Array<[string, HTMLElement]> {
        const found: Array<[string, HTMLElement]> = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const text = n.textContent?.trim();
          const el = n.parentElement;
          if (!text || !el) continue;
          const style = getComputedStyle(el);
          if (style.display !== "none" && style.visibility !== "hidden") {
            found.push([text, el]);
          }
        }
        return found;
      }

      const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
      const describe = (text: string, el: Element) =>
        `${size(el)}px: ${text.slice(0, 40)}`;

      const main = document.querySelector("main")!;
      const texts = visibleText(main);
      return {
        under16: texts
          .filter(([, el]) => size(el) < 16)
          .map(([text, el]) => describe(text, el)),
        longUnder18: texts
          .filter(([text]) => text.length >= 30)
          .filter(([, el]) => size(el) < 18 && !el.closest(CHROME))
          .map(([text, el]) => describe(text, el)),
        smallestArea: Math.min(
          ...[...document.querySelectorAll("textarea")].map(size),
        ),
        shortestButton: Math.min(
          ...[...main.querySelectorAll("button")].map((b) =>
            Math.round(b.getBoundingClientRect().height),
          ),
        ),
        // Bigger text must not push the page wider than the phone.
        sidewaysScroll:
          document.documentElement.scrollWidth > window.innerWidth,
      };
    });
  }

  test("is readable on a phone before anything is typed: nothing under 16px, body text 18px, tall buttons", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await open(page);
    const m = await measure(page);
    expect(m.under16).toEqual([]);
    expect(m.longUnder18).toEqual([]);
    expect(m.smallestArea).toBeGreaterThanOrEqual(16);
    expect(m.shortestButton).toBeGreaterThanOrEqual(44);
    expect(m.sidewaysScroll).toBe(false);
  });

  test("is readable on a phone with a result on screen too", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    const development = {
      mode: "develop",
      whatChanged: "Sharpened the rivals.",
      alreadyInteresting:
        "Everything is made from dragon parts, yet there are no dragons nearby.",
      centralQuestion: "Where do the parts come from?",
      makeItMove: "The last shipment is late and the smiths are running out.",
      peopleWhoCare: [
        {
          name: "Mara",
          role: "Smith",
          wants: "More scales",
          conflictsWith: "The Warden",
        },
        {
          name: "The Warden",
          role: "Guard",
          wants: "Nothing new enters",
          conflictsWith: "Mara",
        },
      ],
      playerDirections: [
        {
          title: "Follow the shipment",
          description: "Trace it back along the road.",
        },
        {
          title: "Search the cellars",
          description: "Find where the old stock is kept.",
        },
      ],
      consequences: "The town runs dry within a season.",
      creatorQuestions: ["Who built the town?", "Are dragons extinct?"],
      generatorSuggestions: [
        { generatorKey: "npc", reason: "A person with a stake in it." },
        { generatorKey: "faction", reason: "A group that wants the parts." },
      ],
    };
    await page.addInitScript((latest) => {
      try {
        sessionStorage.setItem(
          "idea-developer-session",
          JSON.stringify({
            version: 1,
            ideaDraft: "",
            mode: "develop",
            conversation: {
              ideaText: "A town of dragon parts.",
              turns: [
                {
                  kind: "idea",
                  mode: "develop",
                  text: "A town of dragon parts.",
                  status: "done",
                },
                {
                  kind: "answer-questions",
                  mode: "develop",
                  text: "They left.",
                  status: "done",
                },
              ],
              previousInteractionId: "i-1",
              latest,
            },
          }),
        );
      } catch {
        /* ignore */
      }
    }, development);
    await open(page);
    await expect(page.getByText("Where do the parts come from?")).toBeVisible();
    const m = await measure(page);
    expect(m.under16).toEqual([]);
    expect(m.longUnder18).toEqual([]);
    expect(m.smallestArea).toBeGreaterThanOrEqual(16);
    expect(m.shortestButton).toBeGreaterThanOrEqual(44);
    expect(m.sidewaysScroll).toBe(false);
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
