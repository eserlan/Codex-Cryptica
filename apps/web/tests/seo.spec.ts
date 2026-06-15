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
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await expect(page).toHaveTitle(
      "Codex Cryptica — Local-First RPG Campaign Manager & Worldbuilding Tool",
      {
        timeout: 15000,
      },
    );
    await expect(page.getByText(/Private RPG Lore Vault/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test("non-prerendered routes fallback to SPA shell", async ({ page }) => {
    // Navigate to a route that isn't prerendered but exists in the app
    await page.goto("/oracle");

    // It should still have the layout title from +layout.svelte, wait for compile/hydration
    await expect(page).toHaveTitle(/Lore Oracle | Codex Cryptica/, {
      timeout: 15000,
    });

    // It should show the loading state or the oracle interface
    const oracleIndicator = page.getByText(/Lore Oracle/i).first();
    await expect(oracleIndicator).toBeVisible({ timeout: 15000 });
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
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          "codex-cryptica-help-state",
          JSON.stringify({ completedTours: ["initial-onboarding"] }),
        );
        localStorage.setItem("codex_dismissed_landing", "true");
      });
    });

    test("solutions and comparison pages prerender correctly", async ({
      request,
    }) => {
      const toolsResponse = await request.get("/tools");
      expect(toolsResponse.ok()).toBe(true);
      const toolsHtml = await toolsResponse.text();
      expect(toolsHtml).toContain("RPG Tools, Generators, and Comparisons");
      expect(toolsHtml).toContain("/tools/dnd-npc-generator");
      expect(toolsHtml).toContain("/tools/faction-generator");
      expect(toolsHtml).toContain("/solutions/campaign-manager");
      expect(toolsHtml).toContain("/vs/world-anvil");

      // Test Solutions page prerendering
      const response = await request.get("/solutions/campaign-manager");
      expect(response.ok()).toBe(true);
      const html = await response.text();
      expect(html).toContain("RPG Campaign Manager Features & Setup Guide");
      expect(html).toContain(
        "Everything you need to plan, run, and track campaigns",
      );

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
      // Since tools redirects, html is generators/npc
      expect(html).toContain("RPG NPC Generator");
      expect(html).toContain("Create NPCs across any genre");
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
        "RPG NPC Generator",
      );
      await expect(page.getByLabel("Add campaign context")).toBeVisible();
      await expect(
        page.getByRole("link", { name: /AI GM assistant/i }),
      ).toHaveAttribute("href", "/solutions/ai-gm-assistant");

      // 2. Select AI Mode checkbox to off (so it runs fallback instantly and deterministically offline-friendly in tests)
      const aiToggle = page.locator("#ai-toggle");
      if (await aiToggle.isChecked()) {
        await aiToggle.uncheck();
      }
      await page
        .getByLabel("Add campaign context")
        .fill("a haunted border city under siege");

      // 3. Trigger generate
      await page.click("#generate-button");

      // 4. Wait for generated element to show up
      await expect(page.locator("#save-to-codex-btn")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Who they are" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "What they want" }),
      ).toBeVisible();
      const generatedTitle = page.locator("h2").first();
      await expect(generatedTitle).not.toContainText("No Draft Generated"); // Check that a title is populated

      const generatedName = await generatedTitle.textContent();
      expect(generatedName).toBeTruthy();

      // 5. Click Save to Codex
      await page.click("#save-to-codex-btn");
      await page.click("button:has-text('Open Codex')");

      // 6. Verify redirection to workspace app root
      await expect(page).toHaveURL(/\/$/);

      // 7. Verify the new vault is active and the entity is loaded/selected
      await expect(
        page.getByRole("heading", { name: generatedName!.trim(), level: 2 }),
      ).toBeVisible({ timeout: 15000 });
    });

    test("faction generator page and import conversion funnel flow", async ({
      page,
      request,
    }) => {
      const response = await request.get("/tools/faction-generator");
      expect(response.ok()).toBe(true);
      const html = await response.text();
      // Since tools redirects, html is generators/faction
      expect(html).toContain("RPG Faction Generator");
      expect(html).toContain("Forge campaign-ready organizations");
      expect(html).toContain("tools/dnd-npc-generator");
      expect(html).toContain("/solutions/worldbuilding-tool");
      const jsonLdScripts = [
        ...html.matchAll(
          /<script type="application\/ld\+json">([^<]+)<\/script>/g,
        ),
      ].map((match) => JSON.parse(match[1]));
      const faqSchema = jsonLdScripts.find(
        (schema) => schema["@type"] === "FAQPage",
      );
      expect(faqSchema).toBeTruthy();
      expect(faqSchema.mainEntity).toHaveLength(4);
      expect(faqSchema.mainEntity[0].name).toBe(
        "What does the faction generator create?",
      );

      await page.goto("/tools/faction-generator");
      await expect(page.locator("#generator-title")).toContainText(
        "Faction Generator",
      );
      await expect(page.getByLabel("Choose what they are")).toBeVisible();
      await expect(page.getByLabel("Choose their scale")).toBeVisible();
      await expect(page.getByLabel("Choose their morality")).toBeVisible();
      await expect(page.getByLabel("Add campaign context")).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Worldbuilding tool/i }),
      ).toHaveAttribute("href", "/solutions/worldbuilding-tool");

      const aiToggle = page.locator("#ai-toggle");
      if (await aiToggle.isChecked()) {
        await aiToggle.uncheck();
      }
      await page
        .getByLabel("Choose what they are")
        .selectOption("Merchant Guild");
      await page.getByLabel("Choose their scale").selectOption("Single city");
      await page
        .getByLabel("Add campaign context")
        .fill("a canal city split by old guild rivalries");

      await page.click("#generate-button");

      await expect(page.locator("#save-to-codex-btn")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "What they control" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "What they want" }),
      ).toBeVisible();
      const generatedTitle = page.locator("h2").first();
      await expect(generatedTitle).not.toContainText("No Draft Generated");
      const generatedName = await generatedTitle.textContent();
      expect(generatedName).toBeTruthy();

      await page.click("#save-to-codex-btn");
      await page.click("button:has-text('Open Codex')");
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("heading", { name: generatedName!.trim(), level: 2 }),
      ).toBeVisible({ timeout: 15000 });
    });

    test("pantheon and god generator page funnel flows", async ({
      page,
      request,
    }) => {
      // 1. Check Pantheon Generator static HTML & SEO elements
      const response = await request.get("/generators/pantheon-generator");
      expect(response.ok()).toBe(true);
      const html = await response.text();
      expect(html).toContain("RPG Pantheon Generator");

      // 2. Navigate to Pantheon Generator E2E page
      await page.goto("/generators/pantheon-generator");
      await expect(page.locator("#generator-title")).toContainText(
        "RPG Pantheon Generator",
      );

      // Toggle AI off
      const aiToggle = page.locator("#ai-toggle");
      if (await aiToggle.isChecked()) {
        await aiToggle.uncheck();
      }

      // Check default target mode (should be pantheon)
      await expect(page.locator("#pantheon-mode-select")).toHaveValue(
        "pantheon",
      );

      // Generate
      await page.click("#generate-button");

      // Verify generated content and saving
      await expect(page.locator("#save-to-codex-btn")).toBeVisible();
      const generatedTitle = page.locator("h2").first();
      await expect(generatedTitle).not.toContainText("No Draft Generated");
      const generatedName = await generatedTitle.textContent();
      expect(generatedName).toBeTruthy();

      await page.click("#save-to-codex-btn");
      await page.click("button:has-text('Open Codex')");
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("heading", { name: generatedName!.trim(), level: 2 }),
      ).toBeVisible({ timeout: 15000 });

      // 3. Navigate to Deity Generator E2E page
      await page.goto("/generators/god-generator");
      await expect(page.locator("#generator-title")).toContainText(
        "RPG God & Deity Generator",
      );

      // Toggle AI off
      const aiToggleGod = page.locator("#ai-toggle");
      if (await aiToggleGod.isChecked()) {
        await aiToggleGod.uncheck();
      }

      // Check default target mode (should be single)
      await expect(page.locator("#pantheon-mode-select")).toHaveValue("single");

      // Generate
      await page.click("#generate-button");

      // Verify generated content and saving
      await expect(page.locator("#save-to-codex-btn")).toBeVisible();
      const generatedGodTitle = page.locator("h2").first();
      await expect(generatedGodTitle).not.toContainText("No Draft Generated");
      const generatedGodName = await generatedGodTitle.textContent();
      expect(generatedGodName).toBeTruthy();

      await page.click("#save-to-codex-btn");
      await page.click("button:has-text('Open Codex')");
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("heading", { name: generatedGodName!.trim(), level: 2 }),
      ).toBeVisible({ timeout: 20000 });
    });
  });
});
