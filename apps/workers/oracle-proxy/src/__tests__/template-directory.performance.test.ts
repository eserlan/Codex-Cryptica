import { describe, expect, it } from "vitest";
import worker from "../index";

class Bucket {
  store = new Map<
    string,
    { body: string; customMetadata?: Record<string, string> }
  >();
  async put(
    key: string,
    body: string,
    options?: { customMetadata?: Record<string, string> },
  ) {
    this.store.set(key, { body, customMetadata: options?.customMetadata });
  }
  async get(key: string) {
    const item = this.store.get(key);
    return item
      ? { text: async () => item.body, customMetadata: item.customMetadata }
      : null;
  }
  async head(key: string) {
    const item = this.store.get(key);
    return item ? { customMetadata: item.customMetadata } : null;
  }
  async list({ prefix }: { prefix: string }) {
    return {
      objects: [...this.store.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ key })),
      truncated: false,
    };
  }
  async delete(key: string) {
    this.store.delete(key);
  }
}

describe("template directory performance", () => {
  it("filters a 1,000-listing fixture within the browse budget", async () => {
    const bucket = new Bucket();
    for (let index = 0; index < 1_000; index++) {
      const id = `listing-${index}`;
      const listing = {
        schemaVersion: 1,
        listingId: id,
        title: `Template ${index}`,
        description: "Shared layout",
        system: "Homebrew",
        labels: [index % 2 ? "npc" : "character"],
        packageVersion: 1,
        listingCreatedAt: "2026-07-31T00:00:00.000Z",
        listingUpdatedAt: "2026-07-31T00:00:00.000Z",
      };
      await bucket.put(
        `templates/listings/${id}/listing.json`,
        JSON.stringify(listing),
      );
      await bucket.put(
        `templates/listings/${id}/package.json`,
        JSON.stringify({
          schemaVersion: 1,
          template: {
            name: listing.title,
            description: listing.description,
            system: listing.system,
            labels: listing.labels,
            fields: [{ id: "hp", label: "HP", type: "counter" }],
          },
        }),
      );
    }
    const started = performance.now();
    const response = await worker.fetch(
      new Request(
        "https://proxy/api/template-directory/listings?q=Template%20999",
      ),
      { GEMINI_API_KEY: "test", BUCKET: bucket },
      {} as ExecutionContext,
    );
    const elapsed = performance.now() - started;
    expect(response.status).toBe(200);
    expect(
      ((await response.json()) as { results: unknown[] }).results,
    ).toHaveLength(1);
    expect(elapsed).toBeLessThan(2_000);
  });

  it("removes an unpublished listing from fresh browse responses", async () => {
    const bucket = new Bucket();
    const listing = {
      schemaVersion: 1,
      listingId: "one",
      title: "One",
      description: "Shared",
      system: "Homebrew",
      labels: [],
      packageVersion: 1,
      listingCreatedAt: "2026-07-31T00:00:00.000Z",
      listingUpdatedAt: "2026-07-31T00:00:00.000Z",
    };
    await bucket.put(
      "templates/listings/one/listing.json",
      JSON.stringify(listing),
      { customMetadata: { ownerToken: "token" } },
    );
    await bucket.put(
      "templates/listings/one/package.json",
      JSON.stringify({
        schemaVersion: 1,
        template: {
          name: "One",
          description: "Shared",
          system: "Homebrew",
          labels: [],
          fields: [{ id: "hp", label: "HP", type: "counter" }],
        },
      }),
    );
    const deleted = await worker.fetch(
      new Request("https://proxy/api/template-directory/listings/one", {
        method: "DELETE",
        headers: { Authorization: "Bearer token" },
      }),
      { GEMINI_API_KEY: "test", BUCKET: bucket },
      {} as ExecutionContext,
    );
    expect(deleted.status).toBe(200);
    const browsed = await worker.fetch(
      new Request("https://proxy/api/template-directory/listings"),
      { GEMINI_API_KEY: "test", BUCKET: bucket },
      {} as ExecutionContext,
    );
    expect(
      ((await browsed.json()) as { results: unknown[] }).results,
    ).toHaveLength(0);
    expect(browsed.headers.get("Cache-Control")).toBe("public, max-age=15");
  });
});
