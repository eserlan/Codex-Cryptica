import { expect, test, type Locator } from "@playwright/test";

async function expectReadable(locator: Locator, minimum: number) {
  expect(await locator.count()).toBeGreaterThan(0);
  for (const element of await locator.all()) {
    await element.scrollIntoViewIfNeeded();
    const dimensions = await element.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        size: parseFloat(style.fontSize),
        overflow: el.scrollWidth - el.clientWidth,
      };
    });
    expect(dimensions.size).toBeGreaterThanOrEqual(minimum);
    expect(dimensions.overflow).toBeLessThanOrEqual(1);
  }
}

test("generator guides, links and FAQs use the mobile reading scale without overflow", async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const slug of ["quest", "npc", "adventure-generator"]) {
    await page.goto(`/generators/${slug}`);
    const guide = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: /^How to use the/ }) })
      .last();
    const faq = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: /Generator FAQ$/ }) })
      .last();
    const related = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", {
          name: "More RPG Worldbuilding Tools",
        }),
      })
      .last();
    await expect(guide).toBeVisible();
    await expect(faq).toBeVisible();
    for (const width of [360, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      const scale =
        width < 768
          ? { body: 18, heading: 20, link: 16 }
          : { body: 16, heading: 18, link: 14 };
      await expectReadable(guide.locator("p"), scale.body);
      await expectReadable(guide.locator("h3"), scale.heading);
      await expectReadable(guide.locator("a"), scale.link);
      await expectReadable(
        faq.locator("article p:not(.text-micro)"),
        scale.body,
      );
      await expectReadable(faq.locator("article h3"), scale.heading);
      if (await related.count()) {
        await expectReadable(related.locator("a"), scale.link);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
