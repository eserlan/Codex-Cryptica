import { test, expect } from "@playwright/test";

const POST = "/blog/introducing-the-canvas";

test.describe("Blog TOC anchors and rail", () => {
  test("TOC jump exposes the heading below the sticky header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(POST);

    const links = page.getByTestId("blog-toc").getByRole("link");
    const last = links.last();
    const id = (await last.getAttribute("href"))!.slice(1);
    await last.click();

    const heading = page.locator(`[id="${id}"]`);
    await expect(heading).toBeInViewport({ ratio: 1 });
    const headerBottom = await page
      .locator("header")
      .first()
      .evaluate((el) => el.getBoundingClientRect().bottom);
    const top = await heading.evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(headerBottom);
  });

  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
  ]) {
    test(`stuck rail stays reachable at ${width}x${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto(POST);

      const rail = page.getByRole("complementary", {
        name: "Article navigation",
      });
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(200);

      const box = (await rail.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(height);

      // The last entry is reachable by scrolling the rail itself.
      const last = rail.getByRole("link").last();
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport({ ratio: 1 });

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }

  test("TOC plus series navigation scrolls inside the rail at 1280x720", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/blog/drafts-are-not-canon");

    const rail = page.getByRole("complementary", {
      name: "Article navigation",
    });
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(200);

    const box = (await rail.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(720);

    const last = rail.getByRole("link").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
  });
});
