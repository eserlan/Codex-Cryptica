import { test, expect } from "@playwright/test";

test.describe("SEO and Prerendering", () => {
  const routes = [
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
      if (route.path === "/features") {
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
      if (route.path === "/features") {
        await expect(page.getByText(/Core Features/i)).toBeVisible();
      } else {
        // Legal pages - use first() to avoid strict mode violations with multiple mentions
        await expect(page.getByText(/Codex Cryptica/i).first()).toBeVisible();
      }
    });
  }

  test("root route / has correct title and content after hydration", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Codex Cryptica | AI RPG Campaign Manager");
    await expect(page.getByText(/Build Your World/i)).toBeVisible();
  });

  test("non-prerendered routes fallback to SPA shell", async ({ page }) => {
    // Navigate to a route that isn't prerendered but exists in the app
    await page.goto("/oracle");

    // It should still have the layout title from +layout.svelte
    await expect(page).toHaveTitle(/Codex Cryptica/);

    // It should show the loading state or the oracle interface
    const oracleIndicator = page.getByText(/Lore Oracle/i).first();
    await expect(oracleIndicator).toBeVisible();
  });

  test("llms.txt standard files exist and are discoverable", async ({
    page,
    request,
  }) => {
    // 1. Check llms.txt
    const llmsResponse = await request.get("/llms.txt");
    expect(llmsResponse.ok()).toBe(true);
    expect(llmsResponse.headers()["content-type"]).toContain("text/plain");
    const llmsContent = await llmsResponse.text();
    expect(llmsContent).toContain("# Codex Cryptica");

    // 2. Check llms-full.txt
    const fullResponse = await request.get("/llms-full.txt");
    expect(fullResponse.ok()).toBe(true);
    expect(fullResponse.headers()["content-type"]).toContain("text/plain");
    const fullContent = await fullResponse.text();
    // Ensure the file is non-trivially large
    expect(fullContent.length).toBeGreaterThan(5000);
    // Ensure it contains core feature summaries
    expect(fullContent).toContain("## Core Features");
    // Ensure it contains help documentation
    expect(fullContent).toContain("## Help Documentation");
    // Ensure specific known articles are present
    expect(fullContent).toContain("CHAT COMMANDS");

    // 3. Check discoverability in head
    await page.goto("/");
    const link = page.locator('link[rel="llms"]');
    await expect(link).toHaveAttribute("href", /llms\.txt$/);

    // 4. Check robots.txt
    const robotsResponse = await request.get("/robots.txt");
    const robotsText = await robotsResponse.text();
    expect(robotsText).toContain("Allow: /llms.txt");
    expect(robotsText).toContain("Allow: /llms-full.txt");
  });

  test.describe("SEO Landing Pages and Generator Funnel", () => {
    test("solutions and comparison pages prerender correctly", async ({
      request,
    }) => {
      // Test Solutions page prerendering
      const response = await request.get("/solutions/campaign-manager");
      expect(response.ok()).toBe(true);
      const html = await response.text();
      expect(html).toContain("Best Free RPG Campaign Manager");
      expect(html).toContain("The Ultimate Local-First RPG Campaign Manager");

      // Test Comparisons page prerendering
      const compResponse = await request.get("/vs/obsidian");
      expect(compResponse.ok()).toBe(true);
      const compHtml = await compResponse.text();
      expect(compHtml).toContain("Codex Cryptica vs Obsidian");
      expect(compHtml).toContain("Feature Matrix: Codex vs Obsidian");
      expect(compHtml).toContain("table");
    });

    test("generator page and import conversion funnel flow", async ({
      page,
      request,
    }) => {
      const response = await request.get("/tools/dnd-npc-generator");
      expect(response.ok()).toBe(true);
      const html = await response.text();
      expect(html).toContain("D&amp;D NPC Generator");
      expect(html).toContain("What does each generated NPC include?");
      expect(html).toContain("/solutions/ai-gm-assistant");
      expect(html).toContain("/free-rpg-campaign-manager");
      const jsonLdScripts = [
        ...html.matchAll(
          /<script type="application\/ld\+json">([^<]+)<\/script>/g,
        ),
      ].map((match) => JSON.parse(match[1]));
      const faqSchema = jsonLdScripts.find(
        (schema) => schema["@type"] === "FAQPage",
      );
      expect(faqSchema).toBeTruthy();
      expect(faqSchema["@type"]).toBe("FAQPage");
      expect(faqSchema.mainEntity).toHaveLength(4);
      expect(faqSchema.mainEntity[0].name).toBe(
        "Does the D&D NPC generator require an account?",
      );

      // 1. Navigate to generator
      await page.goto("/tools/dnd-npc-generator");
      await expect(page.locator("#generator-title")).toContainText(
        "D&D NPC Generator",
      );
      await expect(page.getByLabel("Optional Campaign Context")).toBeVisible();
      await expect(
        page.getByRole("link", { name: /AI GM assistant/i }),
      ).toHaveAttribute("href", "/solutions/ai-gm-assistant");

      // 2. Select AI Mode checkbox to off (so it runs fallback instantly and deterministically offline-friendly in tests)
      const aiToggle = page.locator("#ai-toggle");
      if (await aiToggle.isChecked()) {
        await aiToggle.uncheck();
      }
      await page
        .getByLabel("Optional Campaign Context")
        .fill("a haunted border city under siege");

      // 3. Trigger generate
      await page.click("#generate-button");

      // 4. Wait for generated element to show up
      await expect(page.locator("#save-to-codex-btn")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Faction Connection" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Plot Hook" }),
      ).toBeVisible();
      const generatedTitle = page.locator("h2").first();
      await expect(generatedTitle).not.toContainText("No Draft Generated"); // Check that a title is populated

      const generatedName = await generatedTitle.textContent();
      expect(generatedName).toBeTruthy();

      // 5. Click Save to Codex
      await page.click("#save-to-codex-btn");

      // 6. Verify redirection to workspace app root
      await expect(page).toHaveURL(/\/$/);

      // 7. Verify the new vault is active and the entity is loaded/selected
      // Since it's local-first OPFS or fallback, wait for the imported entity detail panel to open or show up in sidebar
      await expect(
        page.getByRole("heading", { name: generatedName!.trim(), level: 2 }),
      ).toBeVisible();
    });
  });
});
