import { beforeEach, describe, expect, it } from "vitest";
import worker from "../index";
import {
  getDirectoryCacheControl,
  getGuestUrl,
  getListingObjectKey,
  projectDirectoryResult,
} from "../directory";

class MockR2Bucket {
  store = new Map<
    string,
    {
      body: ArrayBuffer | Uint8Array | string;
      customMetadata?: Record<string, string>;
      contentType?: string;
    }
  >();

  async head(key: string) {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      customMetadata: item.customMetadata,
      httpMetadata: { contentType: item.contentType },
      size:
        typeof item.body === "string"
          ? new TextEncoder().encode(item.body).byteLength
          : item.body.byteLength,
    };
  }

  async get(key: string) {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      body:
        typeof item.body === "string"
          ? new TextEncoder().encode(item.body)
          : item.body,
      customMetadata: item.customMetadata,
      httpMetadata: { contentType: item.contentType },
      size:
        typeof item.body === "string"
          ? new TextEncoder().encode(item.body).byteLength
          : item.body.byteLength,
    };
  }

  async put(key: string, body: any, options?: any) {
    let bodyData = body;
    if (body && typeof body.arrayBuffer === "function") {
      bodyData = await body.arrayBuffer();
    }
    this.store.set(key, {
      body: bodyData,
      customMetadata: options?.customMetadata,
      contentType: options?.contentType,
    });
    return {};
  }

  async delete(key: string) {
    this.store.delete(key);
    return {};
  }

  async list(options?: { prefix?: string; cursor?: string }) {
    const prefix = options?.prefix || "";
    const objects: { key: string; size: number }[] = [];
    for (const [key, item] of this.store) {
      if (key.startsWith(prefix)) {
        objects.push({
          key,
          size:
            typeof item.body === "string"
              ? new TextEncoder().encode(item.body).byteLength
              : item.body.byteLength,
        });
      }
    }
    return { objects, truncated: false };
  }
}

describe("directory helpers", () => {
  it("builds listing object keys", () => {
    expect(getListingObjectKey("pub-123")).toBe(
      "directory/listings/pub-123.json",
    );
  });

  it("builds guest URLs", () => {
    expect(getGuestUrl("pub-123")).toBe("/guest/pub-123");
  });

  it("returns the public cache header", () => {
    expect(getDirectoryCacheControl()).toBe("public, max-age=15");
  });

  it("projects safe directory result fields", () => {
    const result = projectDirectoryResult(
      new Request(
        "https://oracle-proxy.espen-erlandsen.workers.dev/api/directory/listings",
      ),
      {
        schemaVersion: 1,
        publishId: "pub-123",
        guestUrl: "/guest/pub-123",
        title: "Night Market",
        description: "Find smugglers and rumors.",
        labels: ["cyberpunk"],
        coverImageAssetId: "cover.webp",
        coverImageAlt: "Neon stalls",
        ownerDisplayName: "Eserlan",
        visibleEntityCount: 6,
        snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
        listingCreatedAt: "2026-06-30T12:00:00.000Z",
        listingUpdatedAt: "2026-06-30T12:00:00.000Z",
      },
    );

    expect(result).toEqual({
      publishId: "pub-123",
      guestUrl: "/guest/pub-123",
      title: "Night Market",
      description: "Find smugglers and rumors.",
      labels: ["cyberpunk"],
      coverImageUrl:
        "https://oracle-proxy.espen-erlandsen.workers.dev/api/published/pub-123/assets/cover.webp",
      coverImageAlt: "Neon stalls",
      ownerDisplayName: "Eserlan",
      visibleEntityCount: 6,
      listingUpdatedAt: "2026-06-30T12:00:00.000Z",
    });
    expect((result as any).writeToken).toBeUndefined();
  });
});

describe("directory routes", () => {
  let bucket: MockR2Bucket;
  let env: any;
  const ctx = {} as ExecutionContext;

  beforeEach(async () => {
    bucket = new MockR2Bucket();
    env = {
      GEMINI_API_KEY: "test-key",
      BUCKET: bucket,
    };

    await bucket.put(
      "published/pub-123/bundle.json",
      JSON.stringify({
        schemaVersion: 1,
        publishId: "pub-123",
        vaultTitle: "Night Market",
        publishedAt: "2026-06-30T12:00:00.000Z",
        publisherVersion: "1.0.0",
        activeTheme: {},
        entities: [
          { id: "e1", type: "note", title: "Rumor", status: "active" },
        ],
        relationships: [],
        maps: [],
        canvases: [],
        assetManifest: [
          {
            assetId: "cover.webp",
            filename: "cover.webp",
            mimeType: "image/webp",
            hash: "a".repeat(64),
          },
        ],
      }),
      {
        contentType: "application/json",
        customMetadata: {
          writeToken: "write-token-123",
          vaultTitle: "Night Market",
          publishedAt: "2026-06-30T12:00:00.000Z",
          entityCount: "1",
          relationshipCount: "0",
          assetCount: "1",
        },
      },
    );
  });

  function createRequest(
    path: string,
    method: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    return new Request(
      `https://oracle-proxy.espen-erlandsen.workers.dev${path}`,
      {
        method,
        headers: {
          Origin: "https://codex-cryptica.com",
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
  }

  it("saves a public listing with a valid write token", async () => {
    const response = await worker.fetch(
      createRequest(
        "/api/published/pub-123/listing",
        "PUT",
        {
          title: "Night Market",
          description: "Find smugglers and rumors.",
          labels: ["cyberpunk"],
          coverImageAssetId: "cover.webp",
          ownerDisplayName: "Eserlan",
          rightsAcknowledged: true,
        },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.publishId).toBe("pub-123");
    expect(body.guestUrl).toBe("/guest/pub-123");
    expect(bucket.store.has("directory/listings/pub-123.json")).toBe(true);
  });

  it("returns 404 when listing a missing snapshot", async () => {
    const response = await worker.fetch(
      createRequest(
        "/api/published/missing/listing",
        "PUT",
        {
          title: "Ghost World",
          description: "Missing snapshot",
          labels: ["ghost"],
          rightsAcknowledged: true,
        },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );

    expect(response.status).toBe(404);
  });

  it("returns 401 when the write token is missing or invalid", async () => {
    const missingToken = await worker.fetch(
      createRequest("/api/published/pub-123/listing", "PUT", {
        title: "Night Market",
        description: "Find smugglers and rumors.",
        labels: ["cyberpunk"],
      }),
      env,
      ctx,
    );
    expect(missingToken.status).toBe(401);

    const invalidToken = await worker.fetch(
      createRequest(
        "/api/published/pub-123/listing",
        "PUT",
        {
          title: "Night Market",
          description: "Find smugglers and rumors.",
          labels: ["cyberpunk"],
        },
        { Authorization: "Bearer wrong-token" },
      ),
      env,
      ctx,
    );
    expect(invalidToken.status).toBe(401);
  });

  it("fetches an existing saved public listing", async () => {
    await worker.fetch(
      createRequest(
        "/api/published/pub-123/listing",
        "PUT",
        {
          title: "Night Market",
          description: "Find smugglers and rumors.",
          labels: ["cyberpunk"],
          rightsAcknowledged: true,
        },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );

    const response = await worker.fetch(
      createRequest("/api/published/pub-123/listing", "GET"),
      env,
      ctx,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=15");
    expect(await response.json()).toEqual(
      expect.objectContaining({
        publishId: "pub-123",
        title: "Night Market",
      }),
    );
  });

  it("returns 404 for an unlisted world", async () => {
    const response = await worker.fetch(
      createRequest("/api/published/pub-123/listing", "GET"),
      env,
      ctx,
    );

    expect(response.status).toBe(404);
  });

  it("lists searchable directory results using saved listing metadata only", async () => {
    await worker.fetch(
      createRequest(
        "/api/published/pub-123/listing",
        "PUT",
        {
          title: "Night Market",
          description: "Find smugglers and rumors.",
          labels: ["cyberpunk", "markets"],
          rightsAcknowledged: true,
        },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );

    const response = await worker.fetch(
      createRequest(
        "/api/directory/listings?q=smugglers&labels=cyberpunk",
        "GET",
      ),
      env,
      ctx,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=15");
    expect(await response.json()).toEqual({
      results: [
        expect.objectContaining({
          publishId: "pub-123",
          guestUrl: "/guest/pub-123",
          labels: ["cyberpunk", "markets"],
        }),
      ],
    });
  });

  it("deletes a listing without deleting the guest snapshot", async () => {
    await worker.fetch(
      createRequest(
        "/api/published/pub-123/listing",
        "PUT",
        {
          title: "Night Market",
          description: "Find smugglers and rumors.",
          labels: ["cyberpunk"],
          rightsAcknowledged: true,
        },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );

    const response = await worker.fetch(
      createRequest("/api/published/pub-123/listing", "DELETE", undefined, {
        Authorization: "Bearer write-token-123",
      }),
      env,
      ctx,
    );

    expect(response.status).toBe(200);
    expect(bucket.store.has("directory/listings/pub-123.json")).toBe(false);
    expect(bucket.store.has("published/pub-123/bundle.json")).toBe(true);
  });

  it("rejects saving a listing with extra private or editor-only fields", async () => {
    const response = await worker.fetch(
      createRequest(
        "/api/published/pub-123/listing",
        "PUT",
        {
          title: "Night Market",
          description: "Find smugglers and rumors.",
          labels: ["cyberpunk"],
          writeToken: "leaked-token",
          localVaultId: "vault-1",
          rightsAcknowledged: true,
        },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );

    expect(response.status).toBe(400);
  });

  it("lists searchable directory results with browse, search, filter, pagination, and deterministic ordering", async () => {
    const listings = [
      {
        schemaVersion: 1,
        publishId: "pub-1",
        guestUrl: "/guest/pub-1",
        title: "A cyberpunk city",
        description: "Intrigue in the rain.",
        labels: ["cyberpunk", "intrigue"],
        visibleEntityCount: 5,
        snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
        listingCreatedAt: "2026-06-30T12:00:00.000Z",
        listingUpdatedAt: "2026-06-30T12:00:00.000Z",
      },
      {
        schemaVersion: 1,
        publishId: "pub-2",
        guestUrl: "/guest/pub-2",
        title: "A fantasy dungeon",
        description: "Gold and goblins.",
        labels: ["fantasy", "dungeon"],
        visibleEntityCount: 10,
        snapshotPublishedAt: "2026-06-30T12:05:00.000Z",
        listingCreatedAt: "2026-06-30T12:05:00.000Z",
        listingUpdatedAt: "2026-06-30T12:05:00.000Z",
      },
      {
        schemaVersion: 1,
        publishId: "pub-3",
        guestUrl: "/guest/pub-3",
        title: "A cyberpunk bar",
        description: "Drinks and neon lights.",
        labels: ["cyberpunk", "bar"],
        visibleEntityCount: 2,
        snapshotPublishedAt: "2026-06-30T12:02:00.000Z",
        listingCreatedAt: "2026-06-30T12:02:00.000Z",
        listingUpdatedAt: "2026-06-30T12:02:00.000Z",
      },
    ];

    for (const listing of listings) {
      await bucket.put(
        `directory/listings/${listing.publishId}.json`,
        JSON.stringify(listing),
        { contentType: "application/json" },
      );
      await bucket.put(
        `published/${listing.publishId}/bundle.json`,
        JSON.stringify({
          schemaVersion: 1,
          publishId: listing.publishId,
          entities: new Array(listing.visibleEntityCount).fill({}),
          publishedAt: listing.snapshotPublishedAt,
          assetManifest: [],
        }),
        {
          contentType: "application/json",
          customMetadata: {
            writeToken: `write-token-${listing.publishId}`,
          },
        },
      );
    }

    const browseRes = await worker.fetch(
      createRequest("/api/directory/listings", "GET"),
      env,
      ctx,
    );
    expect(browseRes.status).toBe(200);
    const browseData = await browseRes.json();
    expect(browseData.results.map((r: any) => r.publishId)).toEqual([
      "pub-2",
      "pub-3",
      "pub-1",
    ]);

    const searchRes = await worker.fetch(
      createRequest("/api/directory/listings?q=rain", "GET"),
      env,
      ctx,
    );
    const searchData = await searchRes.json();
    expect(searchData.results).toHaveLength(1);
    expect(searchData.results[0].publishId).toBe("pub-1");

    const labelRes = await worker.fetch(
      createRequest("/api/directory/listings?labels=cyberpunk", "GET"),
      env,
      ctx,
    );
    const labelData = await labelRes.json();
    expect(labelData.results.map((r: any) => r.publishId)).toEqual([
      "pub-3",
      "pub-1",
    ]);

    const page1Res = await worker.fetch(
      createRequest("/api/directory/listings?limit=1", "GET"),
      env,
      ctx,
    );
    const page1Data = await page1Res.json();
    expect(page1Data.results).toHaveLength(1);
    expect(page1Data.results[0].publishId).toBe("pub-2");
    expect(page1Data.nextCursor).toBe("1");

    const page2Res = await worker.fetch(
      createRequest("/api/directory/listings?limit=1&cursor=1", "GET"),
      env,
      ctx,
    );
    const page2Data = await page2Res.json();
    expect(page2Data.results).toHaveLength(1);
    expect(page2Data.results[0].publishId).toBe("pub-3");
    expect(page2Data.nextCursor).toBe("2");
  });

  it("hides and deletes stale listing records when the underlying snapshot bundle is unavailable", async () => {
    await worker.fetch(
      createRequest(
        "/api/published/pub-123/listing",
        "PUT",
        {
          title: "Night Market",
          description: "Find smugglers and rumors.",
          labels: ["cyberpunk"],
          rightsAcknowledged: true,
        },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );

    expect(bucket.store.has("directory/listings/pub-123.json")).toBe(true);

    await bucket.delete("published/pub-123/bundle.json");

    const getRes = await worker.fetch(
      createRequest("/api/published/pub-123/listing", "GET"),
      env,
      ctx,
    );
    expect(getRes.status).toBe(404);
    expect(bucket.store.has("directory/listings/pub-123.json")).toBe(false);

    await bucket.put(
      "published/pub-123/bundle.json",
      JSON.stringify({
        schemaVersion: 1,
        publishId: "pub-123",
        vaultTitle: "Night Market",
        publishedAt: "2026-06-30T12:00:00.000Z",
        publisherVersion: "1.0.0",
        entities: [],
        relationships: [],
        assetManifest: [],
      }),
      {
        contentType: "application/json",
        customMetadata: {
          writeToken: "write-token-123",
        },
      },
    );
    await worker.fetch(
      createRequest(
        "/api/published/pub-123/listing",
        "PUT",
        {
          title: "Night Market",
          description: "Find smugglers and rumors.",
          labels: ["cyberpunk"],
          rightsAcknowledged: true,
        },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );
    expect(bucket.store.has("directory/listings/pub-123.json")).toBe(true);

    await bucket.delete("published/pub-123/bundle.json");

    const listRes = await worker.fetch(
      createRequest("/api/directory/listings", "GET"),
      env,
      ctx,
    );
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.results).toHaveLength(0);
    expect(bucket.store.has("directory/listings/pub-123.json")).toBe(false);
  });

  it("returns within 500ms when browsing/searching over 1,000 listing records", async () => {
    for (let i = 0; i < 1000; i++) {
      const id = `perf-${i}`;
      bucket.store.set(`directory/listings/${id}.json`, {
        body: JSON.stringify({
          schemaVersion: 1,
          publishId: id,
          guestUrl: `/guest/${id}`,
          title: `World Title ${i}`,
          description: `Description for world ${i}. Perfect for adventuring.`,
          labels: ["cyberpunk", "rpg"],
          visibleEntityCount: 10,
          snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
          listingCreatedAt: "2026-06-30T12:00:00.000Z",
          listingUpdatedAt: "2026-06-30T12:00:00.000Z",
        }),
      });
      bucket.store.set(`published/${id}/bundle.json`, {
        body: JSON.stringify({ schemaVersion: 1 }),
      });
    }

    const startTime = performance.now();
    const response = await worker.fetch(
      createRequest("/api/directory/listings?q=999&labels=cyberpunk", "GET"),
      env,
      ctx,
    );
    const duration = performance.now() - startTime;

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.results).toHaveLength(1);
    expect(data.results[0].publishId).toBe("perf-999");
    expect(duration).toBeLessThan(500);
  });
});
