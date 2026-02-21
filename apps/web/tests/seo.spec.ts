import { test, expect } from "@playwright/test";

test.describe("SEO and Prerendering", () => {
  const routes = [
    { path: "/", title: "Codex Cryptica | AI RPG Campaign Manager" },
    { path: "/features", title: "Features | Codex Cryptica" },
    { path: "/privacy", title: "Privacy Policy | Codex Cryptica" },
    { path: "/terms", title: "Terms of Service | Codex Cryptica" },
  ];

  for (const route of routes) {
    test(`prerendered route ${route.path} has correct title and content`, async ({
      page,
      request,
    }) => {
      // 1. Verify Static HTML (Prerendering Check)
      const response = await request.get(route.path);
      expect(response.ok()).toBe(true);
      const html = await response.text();

      // Check for title in static HTML
      expect(html).toContain(`<title>${route.title}</title>`);

      // Check for key content in static HTML (no JS needed)
      if (route.path === "/") {
        expect(html).toMatch(/Build Your World/i);
      } else if (route.path === "/features") {
        expect(html).toMatch(/Core/i);
        expect(html).toMatch(/Features/i);
      } else {
        // Legal pages content should be in the fetched markdown inside the HTML
        expect(html).toMatch(/Codex Cryptica/i);
      }

      // 2. Verify Hydrated Page
      await page.goto(route.path);
      await expect(page).toHaveTitle(route.title);

      // Verify some content is present
      if (route.path === "/") {
        await expect(page.getByText(/Build Your World/i)).toBeVisible();
      } else if (route.path === "/features") {
        await expect(page.getByText(/Core Features/i)).toBeVisible();
      } else {
        // Legal pages - use first() to avoid strict mode violations with multiple mentions
        await expect(page.getByText(/Codex Cryptica/i).first()).toBeVisible();
      }
    });
  }

  test("non-prerendered routes fallback to SPA shell", async ({ page }) => {
    // Navigate to a route that isn't prerendered but exists in the app
    await page.goto("/oracle");

    // It should still have the layout title from +layout.svelte
    await expect(page).toHaveTitle(/Codex Cryptica/);

    // It should show the loading state or the oracle interface
    const oracleIndicator = page.getByText(/Lore Oracle/i).first();
    await expect(oracleIndicator).toBeVisible();
  });
});
