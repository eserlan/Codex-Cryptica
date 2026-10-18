import { describe, expect, it, vi } from "vitest";
import {
  EntityTemplateDirectoryError,
  PublicEntityTemplateDirectoryService,
} from "./PublicEntityTemplateDirectoryService";

const listing = {
  schemaVersion: 1,
  templateKind: "entity",
  listingId: "a",
  title: "Guild Hall",
  description: "A place for guilds.",
  entityType: "location",
  labels: ["Fantasy"],
  packageVersion: 1,
  status: "active",
  listingCreatedAt: "2026-01-01T00:00:00.000Z",
  listingUpdatedAt: "2026-01-02T00:00:00.000Z",
};

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const make = (fetchImpl: (...a: any[]) => Promise<Response>) =>
  new PublicEntityTemplateDirectoryService({
    fetch: fetchImpl as any,
    baseUrl: "https://dir.test",
  });

describe("listEntityTemplates", () => {
  it("builds the query and parses the page with facets", async () => {
    const fetch = vi.fn(async () =>
      ok({
        results: [listing],
        facets: { entityTypes: [{ value: "location", count: 1 }] },
      }),
    );
    const page = await make(fetch).listEntityTemplates({
      q: "guild",
      entityType: "location",
      labels: ["Fantasy", "Dark"],
      cursor: "24",
      limit: 12,
    });
    const url = new URL((fetch.mock.calls[0] as any[])[0]);
    expect(url.origin + url.pathname).toBe(
      "https://dir.test/api/template-directory/listings",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      kind: "entity",
      q: "guild",
      entityType: "location",
      labels: "Fantasy,Dark",
      cursor: "24",
      limit: "12",
    });
    expect(page.results[0].listingId).toBe("a");
    expect(page.facets.entityTypes[0].value).toBe("location");
  });

  it("sends only kind when there are no filters", async () => {
    const fetch = vi.fn(async () =>
      ok({ results: [], facets: { entityTypes: [] } }),
    );
    await make(fetch).listEntityTemplates();
    expect(new URL((fetch.mock.calls[0] as any[])[0]).search).toBe(
      "?kind=entity",
    );
  });

  it("throws a plain-language error on a failed response", async () => {
    await expect(
      make(async () => ok({}, 500)).listEntityTemplates(),
    ).rejects.toThrow("Could not load community templates.");
  });

  it("throws a retryable network error when offline", async () => {
    const err = await make(async () => {
      throw new TypeError("Failed to fetch");
    })
      .listEntityTemplates()
      .catch((e) => e);
    expect(err).toBeInstanceOf(EntityTemplateDirectoryError);
    expect(err.code).toBe("network");
    expect(err.message).toMatch(/connection/i);
  });

  it("rejects a malformed body", async () => {
    await expect(
      make(async () => ok({ nope: true })).listEntityTemplates(),
    ).rejects.toThrow();
  });

  it("carries no request body and no vault identifiers", async () => {
    const fetch = vi.fn(async () =>
      ok({ results: [], facets: { entityTypes: [] } }),
    );
    await make(fetch).listEntityTemplates({ q: "x" });
    const init = (fetch.mock.calls[0] as any[])[1];
    expect(init?.body).toBeUndefined();
    expect(init?.method ?? "GET").toBe("GET");
  });
});

describe("getEntityTemplateListing", () => {
  it("returns the detail with the note preview", async () => {
    const detail = await make(async () =>
      ok({ ...listing, previewMarkdown: "## Notes" }),
    ).getEntityTemplateListing("a");
    expect(detail?.previewMarkdown).toBe("## Notes");
  });

  it("returns null on 404 and throws otherwise", async () => {
    expect(
      await make(async () => ok({}, 404)).getEntityTemplateListing("a"),
    ).toBeNull();
    await expect(
      make(async () => ok({}, 500)).getEntityTemplateListing("a"),
    ).rejects.toThrow("Could not load the template listing.");
  });
});

describe("downloadEntityTemplatePackage", () => {
  const pkg = {
    kind: "entity-template",
    formatVersion: 1,
    template: { name: "n", entityType: "location", markdown: "## x" },
  };

  it("returns the package", async () => {
    expect(
      await make(async () => ok(pkg)).downloadEntityTemplatePackage("a"),
    ).toEqual(pkg);
  });

  it("explains a missing listing", async () => {
    const err = await make(async () => ok({}, 404))
      .downloadEntityTemplatePackage("a")
      .catch((e) => e);
    expect(err.code).toBe("not_found");
    expect(err.message).toBe("This template is no longer available.");
  });

  it("rejects a package that fails validation", async () => {
    await expect(
      make(async () =>
        ok({
          kind: "entity-template",
          formatVersion: 1,
          template: { name: "n", entityType: "x", markdown: "" },
        }),
      ).downloadEntityTemplatePackage("a"),
    ).rejects.toThrow();
  });

  it("sends only a plain GET with no vault data", async () => {
    const fetch = vi.fn(async () => ok(pkg));
    await make(fetch).downloadEntityTemplatePackage("a");
    const [url, init] = fetch.mock.calls[0] as any[];
    expect(url).toBe(
      "https://dir.test/api/template-directory/listings/a/package",
    );
    expect(init?.body).toBeUndefined();
  });
});

describe("probeListing", () => {
  it("returns a parsed entity listing", async () => {
    const r = await make(async () =>
      ok({ ...listing, previewMarkdown: "## x" }),
    ).probeListing("a");
    expect(r.kind).toBe("entity");
    expect(r.kind === "entity" && r.detail.previewMarkdown).toBe("## x");
  });

  it("recognises a stat sheet listing without parsing it", async () => {
    const r = await make(async () =>
      ok({ listingId: "s1", system: "Homebrew" }),
    ).probeListing("s1");
    expect(r).toEqual({ kind: "stat-sheet" });
  });

  it("reports a missing listing and throws on server errors", async () => {
    expect(await make(async () => ok({}, 404)).probeListing("a")).toEqual({
      kind: "missing",
    });
    await expect(
      make(async () => ok({}, 500)).probeListing("a"),
    ).rejects.toThrow();
  });
});
