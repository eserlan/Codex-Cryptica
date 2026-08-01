import { describe, expect, it, vi } from "vitest";
import { PublicTemplateDirectoryService } from "./PublicTemplateDirectoryService";

const listing = {
  schemaVersion: 1 as const,
  listingId: "listing-1",
  title: "Watch",
  description: "A watch layout",
  system: "Homebrew",
  labels: [],
  packageVersion: 1,
  listingCreatedAt: "2026-07-31T00:00:00.000Z",
  listingUpdatedAt: "2026-07-31T00:00:00.000Z",
};

const pkg = {
  schemaVersion: 1 as const,
  template: {
    name: "Watch",
    description: "A watch layout",
    system: "Homebrew",
    labels: [],
    fields: [{ id: "hp", label: "HP", type: "counter" as const }],
  },
};

describe("PublicTemplateDirectoryService", () => {
  it("publishes with an acknowledgment and stores the one-time owner token", async () => {
    const saveOwnerToken = vi.fn(async () => {});
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        package: pkg,
        metadata: { rightsAcknowledged: true },
      });
      return new Response(JSON.stringify({ listing, ownerToken: "secret" }), {
        status: 201,
      });
    });
    const service = new PublicTemplateDirectoryService({
      fetch: fetcher as typeof fetch,
      baseUrl: "https://proxy",
      saveOwnerToken,
    });
    const result = await service.publishTemplate({ package: pkg });
    expect(result.ownerToken).toBe("secret");
    expect(saveOwnerToken).toHaveBeenCalledWith("listing-1", "secret");
  });

  it("forwards a cancellation signal without persisting a token", async () => {
    const controller = new AbortController();
    controller.abort();
    const saveOwnerToken = vi.fn(async () => {});
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      throw new DOMException("Aborted", "AbortError");
    });
    const service = new PublicTemplateDirectoryService({
      fetch: fetcher as typeof fetch,
      baseUrl: "https://proxy",
      saveOwnerToken,
    });

    await expect(
      service.publishTemplate({ package: pkg, signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(saveOwnerToken).not.toHaveBeenCalled();
  });

  it("returns null for an unavailable listing", async () => {
    const service = new PublicTemplateDirectoryService({
      fetch: vi.fn(
        async () => new Response(null, { status: 404 }),
      ) as typeof fetch,
      baseUrl: "https://proxy",
    });
    await expect(service.getTemplateListing("missing")).resolves.toBeNull();
  });

  it("validates directory and package responses before returning them", async () => {
    const fetcher = vi.fn(
      async (url: string) =>
        new Response(
          url.endsWith("/package")
            ? JSON.stringify({ invalid: true })
            : JSON.stringify({ invalid: true }),
          { status: 200 },
        ),
    );
    const service = new PublicTemplateDirectoryService({
      fetch: fetcher as typeof fetch,
      baseUrl: "https://proxy",
    });

    await expect(service.listTemplates()).rejects.toThrow();
    await expect(
      service.downloadTemplatePackage("listing-1"),
    ).rejects.toThrow();
  });

  it("encodes browse filters and cursor parameters", async () => {
    const fetcher = vi.fn(async (url: string) => {
      expect(url).toBe(
        "https://proxy/api/template-directory/listings?q=night+market&system=Homebrew&category=npc&labels=night%2Ccity&cursor=24&limit=12",
      );
      return new Response(JSON.stringify({ results: [], nextCursor: "36" }), {
        status: 200,
      });
    });
    const service = new PublicTemplateDirectoryService({
      fetch: fetcher as typeof fetch,
      baseUrl: "https://proxy",
    });

    await expect(
      service.listTemplates({
        q: "night market",
        system: "Homebrew",
        category: "npc",
        labels: ["night", "city"],
        cursor: "24",
        limit: 12,
      }),
    ).resolves.toEqual({ results: [], nextCursor: "36" });
  });
});
