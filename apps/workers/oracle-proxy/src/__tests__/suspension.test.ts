import { describe, expect, it, beforeEach } from "vitest";
import worker from "../index";

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
      uploaded: new Date("2026-07-10T12:00:00Z"),
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
      text: async () =>
        typeof item.body === "string"
          ? item.body
          : new TextDecoder().decode(item.body),
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

describe("Suspension (Delisting and Disable) integration", () => {
  let bucket: MockR2Bucket;
  let env: any;

  beforeEach(() => {
    bucket = new MockR2Bucket();
    env = {
      BUCKET: bucket,
      ALLOWED_ORIGINS: "http://localhost:5173",
    };

    // Setup dummy published bundle
    bucket.store.set("published/pub-1/bundle.json", {
      body: JSON.stringify({
        schemaVersion: 1,
        publishId: "pub-1",
        publishedAt: "2026-07-10T12:00:00Z",
        entities: [{ entityId: "e1", name: "Entity 1", type: "Character" }],
        relationships: [],
        assetManifest: [{ assetId: "img1.png", filename: "img1.png" }],
      }),
      customMetadata: { writeToken: "secret-token" },
    });

    // Setup dummy asset
    bucket.store.set("published/pub-1/assets/img1.png", {
      body: "fake-image-data",
      contentType: "image/png",
    });

    // Setup dummy listing
    bucket.store.set("directory/listings/pub-1.json", {
      body: JSON.stringify({
        schemaVersion: 1,
        publishId: "pub-1",
        guestUrl: "/guest/pub-1",
        title: "Test World",
        description: "A test world description",
        labels: ["cyberpunk"],
        visibleEntityCount: 1,
        snapshotPublishedAt: "2026-07-10T12:00:00Z",
        listingCreatedAt: "2026-07-10T12:00:00Z",
        listingUpdatedAt: "2026-07-10T12:00:00Z",
        rightsAcknowledgedAt: "2026-07-10T12:00:00Z",
      }),
    });

    // Setup dummy notice sidecar
    bucket.store.set("published/pub-1/notice.json", {
      body: JSON.stringify({
        schemaVersion: 1,
        publishId: "pub-1",
        fanContent: true,
        updatedAt: "2026-07-10T12:00:00Z",
      }),
    });
  });

  it("filters out suspended listings (delist or disable) from GET /api/directory/listings", async () => {
    // Normal directory fetch first
    const reqNormal = new Request("http://localhost/api/directory/listings");
    const resNormal = await worker.fetch(reqNormal, env);
    expect(resNormal.status).toBe(200);
    const dataNormal = (await resNormal.json()) as any;
    expect(dataNormal.results.length).toBe(1);

    // Add delist suspension marker
    bucket.store.set("moderation/suspensions/pub-1.json", {
      body: JSON.stringify({
        schemaVersion: 1,
        publishId: "pub-1",
        mode: "delist",
        createdAt: "2026-07-10T13:00:00Z",
      }),
    });

    const resDelisted = await worker.fetch(reqNormal, env);
    expect(resDelisted.status).toBe(200);
    const dataDelisted = (await resDelisted.json()) as any;
    expect(dataDelisted.results.length).toBe(0);
  });

  it("returns 404 from GET /api/published/:publishId/listing when any suspension marker exists", async () => {
    const req = new Request("http://localhost/api/published/pub-1/listing");
    const resBefore = await worker.fetch(req, env);
    expect(resBefore.status).toBe(200);

    // Add delist suspension marker
    bucket.store.set("moderation/suspensions/pub-1.json", {
      body: JSON.stringify({
        schemaVersion: 1,
        publishId: "pub-1",
        mode: "delist",
        createdAt: "2026-07-10T13:00:00Z",
      }),
    });

    const resAfter = await worker.fetch(req, env);
    expect(resAfter.status).toBe(404);
  });

  it("returns HTTP 451 with neutral message when mode=disable on bundle, manifest, and asset endpoints", async () => {
    // Add disable suspension marker
    bucket.store.set("moderation/suspensions/pub-1.json", {
      body: JSON.stringify({
        schemaVersion: 1,
        publishId: "pub-1",
        mode: "disable",
        createdAt: "2026-07-10T13:00:00Z",
      }),
    });

    // Bundle
    const resBundle = await worker.fetch(
      new Request("http://localhost/api/published/pub-1/bundle"),
      env,
    );
    expect(resBundle.status).toBe(451);
    expect(await resBundle.json()).toEqual({
      error: { message: "This world is temporarily unavailable." },
    });

    // Manifest
    const resManifest = await worker.fetch(
      new Request("http://localhost/api/published/pub-1/manifest"),
      env,
    );
    expect(resManifest.status).toBe(451);
    expect(await resManifest.json()).toEqual({
      error: { message: "This world is temporarily unavailable." },
    });

    // Asset
    const resAsset = await worker.fetch(
      new Request("http://localhost/api/published/pub-1/assets/img1.png"),
      env,
    );
    expect(resAsset.status).toBe(451);
    expect(await resAsset.json()).toEqual({
      error: { message: "This world is temporarily unavailable." },
    });
  });

  it("returns suspended: true from GET /api/published/:publishId/notice when suspension marker exists", async () => {
    const req = new Request("http://localhost/api/published/pub-1/notice");
    const resBefore = await worker.fetch(req, env);
    expect(resBefore.status).toBe(200);
    const dataBefore = (await resBefore.json()) as any;
    expect(dataBefore.suspended).toBeFalsy();

    bucket.store.set("moderation/suspensions/pub-1.json", {
      body: JSON.stringify({
        schemaVersion: 1,
        publishId: "pub-1",
        mode: "delist",
        createdAt: "2026-07-10T13:00:00Z",
      }),
    });

    const resAfter = await worker.fetch(req, env);
    expect(resAfter.status).toBe(200);
    const dataAfter = (await resAfter.json()) as any;
    expect(dataAfter.suspended).toBe(true);
  });
});
