import { describe, expect, it, vi } from "vitest";
import {
  CATALOGUE_HUBS,
  DEFAULT_INDEXNOW_ENDPOINT,
  DEFAULT_INDEXNOW_HOST,
  DEFAULT_INDEXNOW_KEY,
  filterIndexableUrls,
  formatIndexNowStepSummary,
  mapChangedFilesToRoutes,
  REDIRECT_STUBS,
  resolveClusterRoutes,
  submitToIndexNow,
} from "./indexnow";

describe("IndexNow Route Mapping (#3164)", () => {
  it("maps changed answer pages to canonical routes and cascades catalogue hubs", () => {
    const result = mapChangedFilesToRoutes([
      "apps/web/src/lib/content/answers/pages/how-do-you-run-a-heist-in-a-tabletop-rpg.ts",
    ]);

    expect(result.catalogueChanged).toBe(true);
    expect(result.candidateRoutes).toContain(
      "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
    );
    expect(result.candidateRoutes).toContain("/answers");
    for (const hub of CATALOGUE_HUBS) {
      expect(result.candidateRoutes).toContain(hub);
    }
  });

  it("maps changed example pages and topic hubs", () => {
    const result = mapChangedFilesToRoutes([
      "apps/web/src/lib/content/examples/pages/the-breakwater-vault-space-western-heist.ts",
      "apps/web/src/lib/content/topics/heists.ts",
    ]);

    expect(result.candidateRoutes).toContain(
      "/examples/the-breakwater-vault-space-western-heist",
    );
    expect(result.candidateRoutes).toContain("/topics/heists");
    expect(result.catalogueChanged).toBe(true);
  });

  it("maps generator engine files to generator routes", () => {
    const result = mapChangedFilesToRoutes([
      "packages/generator-engine/src/heist/generator.ts",
    ]);

    expect(result.candidateRoutes).toContain("/generators/heist");
    expect(result.candidateRoutes).toContain("/generators");
  });

  it("maps blog content without setting catalogueChanged", () => {
    const result = mapChangedFilesToRoutes([
      "apps/web/src/lib/content/blog/my-announcement.md",
    ]);

    expect(result.candidateRoutes).toEqual(["/blog", "/blog/my-announcement"]);
    expect(result.catalogueChanged).toBe(false);
  });

  it("maps static LLM and sitemap files", () => {
    const result = mapChangedFilesToRoutes([
      "apps/web/static/llms.txt",
      "apps/web/static/llms-full.txt",
      "apps/web/static/sitemap.xml",
    ]);

    expect(result.candidateRoutes).toContain("/llms.txt");
    expect(result.candidateRoutes).toContain("/llms-full.txt");
    expect(result.candidateRoutes).toContain("/sitemap.xml");
  });

  it("maps all canonical routes when shared SEO configs change", () => {
    const pagesResult = mapChangedFilesToRoutes([
      "apps/web/src/lib/config/seo-pages.ts",
    ]);
    expect(pagesResult.candidateRoutes).toContain("/solutions");
    expect(pagesResult.candidateRoutes).toContain(
      "/solutions/campaign-manager",
    );
    expect(pagesResult.catalogueChanged).toBe(true);

    const themesResult = mapChangedFilesToRoutes([
      "apps/web/src/lib/content/hub-themes.ts",
    ]);
    expect(themesResult.candidateRoutes).toContain("/generators");
    expect(themesResult.candidateRoutes).toContain("/generators/cyberpunk");
    expect(themesResult.catalogueChanged).toBe(true);

    const comparisonsResult = mapChangedFilesToRoutes([
      "apps/web/src/lib/config/seo-comparisons.ts",
    ]);
    expect(comparisonsResult.candidateRoutes).toContain("/alternatives");
    expect(comparisonsResult.candidateRoutes).toContain("/vs/obsidian");

    const importsResult = mapChangedFilesToRoutes([
      "apps/web/src/lib/config/seo-imports.ts",
    ]);
    expect(importsResult.candidateRoutes).toContain("/migrations");
    expect(importsResult.candidateRoutes).toContain("/import/obsidian-vault");
  });

  it("ignores non-content code files", () => {
    const result = mapChangedFilesToRoutes([
      "apps/web/src/lib/components/Modal.svelte",
      "apps/web/src/lib/stores/theme.svelte.ts",
    ]);

    expect(result.candidateRoutes).toEqual([]);
    expect(result.catalogueChanged).toBe(false);
  });
});

describe("IndexNow Cluster Resolution (#3164)", () => {
  it("resolves the heist cluster and appends catalogue hubs", () => {
    const routes = resolveClusterRoutes("heist");

    // Must include the 8 heist canonical routes
    expect(routes).toContain(
      "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
    );
    expect(routes).toContain(
      "/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg",
    );
    expect(routes).toContain(
      "/answers/how-do-i-run-spies-and-infiltrators-in-an-rpg",
    );
    expect(routes).toContain(
      "/examples/the-breakwater-vault-space-western-heist",
    );
    expect(routes).toContain("/examples/the-dawnheart-diadem-fantasy-heist");
    expect(routes).toContain("/examples/the-quell-extraction-cyberpunk-heist");
    expect(routes).toContain("/generators/heist");
    expect(routes).toContain("/topics/heists");

    // Must include catalogue hubs
    for (const hub of CATALOGUE_HUBS) {
      expect(routes).toContain(hub);
    }

    expect(routes).toHaveLength(8 + CATALOGUE_HUBS.length);
  });
});

describe("IndexNow URL Filtering (#3164)", () => {
  it("allows valid public canonical routes", () => {
    const { validUrls, skipped } = filterIndexableUrls([
      "/generators/heist",
      "https://codexcryptica.com/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
      "/sitemap.xml",
    ]);

    expect(skipped).toEqual([]);
    expect(validUrls).toEqual([
      "https://codexcryptica.com/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
      "https://codexcryptica.com/generators/heist",
      "https://codexcryptica.com/sitemap.xml",
    ]);
  });

  it("rejects private in-app routes via isDisallowedSitemapPath", () => {
    const { validUrls, skipped } = filterIndexableUrls([
      "/vault/secret-lore",
      "/adventure/room-1",
      "/canvas/board",
      "/import",
    ]);

    expect(validUrls).toEqual([]);
    expect(skipped.length).toBe(4);
    for (const s of skipped) {
      expect(s.reason).toMatch(/Private in-app route/);
    }
  });

  it("rejects known 301 redirect stubs", () => {
    for (const stub of REDIRECT_STUBS) {
      const { validUrls, skipped } = filterIndexableUrls([stub]);
      expect(validUrls).toEqual([]);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].reason).toMatch(/301 redirect stub/);
    }
  });

  it("rejects non-production or staging host URLs", () => {
    const { validUrls, skipped } = filterIndexableUrls([
      "https://staging.codexcryptica.com/generators/heist",
      "https://example.com/generators/heist",
    ]);

    expect(validUrls).toEqual([]);
    expect(skipped.length).toBe(2);
    expect(skipped[0].reason).toMatch(/not canonical production host/);
  });

  it("rejects unknown or non-indexable routes not in the discovery registry", () => {
    const { validUrls, skipped } = filterIndexableUrls([
      "/nonexistent-secret-page",
    ]);

    expect(validUrls).toEqual([]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toMatch(/Unknown or non-indexable route/);
  });
});

describe("IndexNow Submission Client (#3164)", () => {
  it("simulates submission in dryRun mode without calling fetch", async () => {
    const fetchSpy = vi.fn();

    const result = await submitToIndexNow(["/generators/heist", "/tools"], {
      dryRun: true,
      fetchFn: fetchSpy as unknown as typeof fetch,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.overallSuccess).toBe(true);
    expect(result.submittedUrls).toEqual([
      "https://codexcryptica.com/generators/heist",
      "https://codexcryptica.com/tools",
    ]);
    expect(result.batches[0].statusText).toBe("Dry Run");
  });

  it("submits URLs in batches to the IndexNow endpoint", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      text: async () => "OK",
    });

    const urls = ["/generators/heist", "/topics/heists", "/tools"];

    const result = await submitToIndexNow(urls, {
      batchSize: 2,
      fetchFn: fetchSpy as unknown as typeof fetch,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.overallSuccess).toBe(true);
    expect(result.batches).toHaveLength(2);

    // Verify first request payload
    const firstCallArgs = fetchSpy.mock.calls[0];
    expect(firstCallArgs[0]).toBe(DEFAULT_INDEXNOW_ENDPOINT);
    const firstPayload = JSON.parse(firstCallArgs[1].body);
    expect(firstPayload.host).toBe(DEFAULT_INDEXNOW_HOST);
    expect(firstPayload.key).toBe(DEFAULT_INDEXNOW_KEY);
    expect(firstPayload.urlList).toHaveLength(2);
  });

  it("safely handles non-positive batchSize without looping indefinitely", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      text: async () => "OK",
    });

    const result = await submitToIndexNow(["/generators/heist", "/tools"], {
      batchSize: -1,
      fetchFn: fetchSpy as unknown as typeof fetch,
    });

    expect(result.overallSuccess).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("handles HTTP 202 Accepted as success", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 202,
      statusText: "Accepted",
      text: async () => "Accepted",
    });

    const result = await submitToIndexNow(["/generators/heist"], {
      fetchFn: fetchSpy as unknown as typeof fetch,
    });

    expect(result.overallSuccess).toBe(true);
    expect(result.batches[0].success).toBe(true);
  });

  it("handles API error responses cleanly", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 422,
      statusText: "Unprocessable Entity",
      text: async () => "Key not valid",
    });

    const result = await submitToIndexNow(["/generators/heist"], {
      fetchFn: fetchSpy as unknown as typeof fetch,
    });

    expect(result.overallSuccess).toBe(false);
    expect(result.batches[0].success).toBe(false);
    expect(result.batches[0].status).toBe(422);
    expect(result.batches[0].message).toContain("Key not valid");
  });

  it("handles network failure cleanly without throwing", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const result = await submitToIndexNow(["/generators/heist"], {
      fetchFn: fetchSpy as unknown as typeof fetch,
    });

    expect(result.overallSuccess).toBe(false);
    expect(result.batches[0].success).toBe(false);
    expect(result.batches[0].status).toBe(0);
    expect(result.batches[0].message).toContain("Network timeout");
  });
});

describe("IndexNow Step Summary Formatter (#3164)", () => {
  it("formats a readable markdown summary for GitHub Actions", () => {
    const summary = formatIndexNowStepSummary({
      host: "codexcryptica.com",
      key: "test-key",
      keyLocation: "https://codexcryptica.com/test-key.txt",
      dryRun: false,
      submittedUrls: ["https://codexcryptica.com/generators/heist"],
      skippedUrls: [{ url: "/vault/secret", reason: "Private in-app route" }],
      batches: [
        {
          batchNumber: 1,
          urlCount: 1,
          status: 200,
          statusText: "OK",
          success: true,
          message: "Submitted 1 URL(s) successfully.",
        },
      ],
      overallSuccess: true,
    });

    expect(summary).toContain("## IndexNow Discovery Notification");
    expect(summary).toContain("🟢 **SUCCESS**");
    expect(summary).toContain("`codexcryptica.com`");
    expect(summary).toContain("https://codexcryptica.com/generators/heist");
    expect(summary).toContain("Private in-app route");
    expect(summary).toContain("✅ Accepted");
  });
});
