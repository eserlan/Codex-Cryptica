import { expect, test } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

test.describe("Adventure Artwork", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("preserves Vault artwork precedence and never sends private cues to asset host", async ({
    page,
  }) => {
    const privateQueries: string[] = [];
    await page.route(
      "https://assets.codexcryptica.com/adventure-artwork/**",
      async (route) => {
        privateQueries.push(route.request().url());
        await route.abort();
      },
    );

    await seedEntity(page, {
      type: "location",
      title: "Secret Harbour Vault",
      content: "Private GM notes about smuggler tunnels.",
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    for (const url of privateQueries) {
      expect(url).not.toContain("Secret");
      expect(url).not.toContain("smuggler");
    }
  });
});
