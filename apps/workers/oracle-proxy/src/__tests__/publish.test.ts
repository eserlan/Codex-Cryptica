import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import worker from "../index";

class MockR2Bucket {
  store = new Map<
    string,
    {
      body: ArrayBuffer | string;
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
    let bodyData: any = body;
    if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
      bodyData = body;
    } else if (typeof body === "string") {
      bodyData = body;
    } else if (body && typeof body.arrayBuffer === "function") {
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
    return {
      objects,
      truncated: false,
    };
  }
}

describe("R2 Publish Endpoints", () => {
  let bucket: MockR2Bucket;
  let env: any;
  const ctx = {} as ExecutionContext;
  const originalFetch = globalThis.fetch;

  function validBundle(overrides: Record<string, unknown> = {}) {
    return {
      schemaVersion: 1,
      publishId: "",
      vaultTitle: "Test World",
      publishedAt: "2026-06-22T22:00:00Z",
      publisherVersion: "1.0.0",
      activeTheme: {},
      entities: [
        { id: "e1", type: "note", title: "Entity 1", status: "active" },
      ],
      relationships: [],
      maps: [],
      canvases: [],
      assetManifest: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    bucket = new MockR2Bucket();
    env = {
      GEMINI_API_KEY: "test-key",
      BUCKET: bucket,
      TURNSTILE_SECRET_KEY: "turnstile-secret",
    };
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            hostname: "codexcryptica.com",
            action: "publish_snapshot",
          }),
        ),
    ) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createRequest(
    urlStr: string,
    method: string,
    body?: any,
    headers: Record<string, string> = {},
  ) {
    return new Request(urlStr, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
        "X-Turnstile-Token": "valid-turnstile-token",
        ...headers,
      },
      body: body
        ? typeof body === "string"
          ? body
          : JSON.stringify(body)
        : undefined,
    });
  }

  it("should block requests with unauthorized origins", async () => {
    const req = new Request("https://proxy.local/api/publish-vault", {
      method: "POST",
      headers: {
        Origin: "https://unauthorized-origin.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vaultTitle: "Blocked World" }),
    });
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(403);
  });

  it("should create a new snapshot on POST /api/publish-vault", async () => {
    const bundle = validBundle();
    const req = createRequest(
      "https://proxy.local/api/publish-vault",
      "POST",
      bundle,
    );
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.publishId).toBeDefined();
    expect(data.writeToken).toBeDefined();
    expect(data.publishedAt).toBeDefined();
    expect(data.isUpdate).toBe(false);

    // Verify key exists in bucket
    const key = `published/${data.publishId}/bundle.json`;
    expect(bucket.store.has(key)).toBe(true);

    const stored = bucket.store.get(key)!;
    const storedBundle = JSON.parse(stored.body as string);
    expect(storedBundle.publishId).toBe(data.publishId);
    expect(storedBundle.vaultTitle).toBe("Test World");
    expect(stored.customMetadata?.vaultTitle).toBe("Test World");
    expect(stored.customMetadata?.writeToken).toBe(data.writeToken);
    expect(stored.customMetadata?.entityCount).toBe("1");
    expect(stored.customMetadata?.relationshipCount).toBe("0");
  });

  it("should require a verified Turnstile token to create a snapshot", async () => {
    const req = createRequest(
      "https://proxy.local/api/publish-vault",
      "POST",
      validBundle(),
      {
        "X-Turnstile-Token": "",
      },
    );

    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(403);
    expect(bucket.store.size).toBe(0);
  });

  it("should reject a bundle that does not match the guest snapshot schema", async () => {
    const req = createRequest("https://proxy.local/api/publish-vault", "POST", {
      vaultTitle: "Invalid World",
      entities: [],
    });

    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(400);
    expect(bucket.store.size).toBe(0);
  });

  it("should enforce the publish creation rate limit", async () => {
    env.PUBLISH_CREATE_RATE_LIMITER = {
      limit: vi.fn(async () => ({ success: false })),
    };
    const res = await worker.fetch(
      createRequest(
        "https://proxy.local/api/publish-vault",
        "POST",
        validBundle(),
      ),
      env,
      ctx,
    );

    expect(res.status).toBe(429);
    expect(bucket.store.size).toBe(0);
  });

  it("should reject publish if payload size exceeds 10MB limit", async () => {
    // Generate large content > 10MB
    const largeContent = "a".repeat(11 * 1024 * 1024);
    const req = createRequest(
      "https://proxy.local/api/publish-vault",
      "POST",
      largeContent,
    );
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(413);
  });

  it("should update an existing snapshot when authorized", async () => {
    // First publish
    const initBundle = validBundle({ vaultTitle: "World V1", entities: [] });
    const res1 = await worker.fetch(
      createRequest(
        "https://proxy.local/api/publish-vault",
        "POST",
        initBundle,
      ),
      env,
      ctx,
    );
    const data1 = (await res1.json()) as any;
    const publishId = data1.publishId;
    const writeToken = data1.writeToken;

    // Second publish (update) with correct writeToken in Authorization header
    const updateBundle = validBundle({ publishId, vaultTitle: "World V2" });
    const res2 = await worker.fetch(
      createRequest(
        `https://proxy.local/api/publish-vault?publishId=${publishId}`,
        "POST",
        updateBundle,
        {
          Authorization: `Bearer ${writeToken}`,
        },
      ),
      env,
      ctx,
    );
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as any;
    expect(data2.isUpdate).toBe(true);
    expect(data2.publishId).toBe(publishId);

    // Check store
    const key = `published/${publishId}/bundle.json`;
    const stored = bucket.store.get(key)!;
    const storedBundle = JSON.parse(stored.body as string);
    expect(storedBundle.vaultTitle).toBe("World V2");
    expect(stored.customMetadata?.vaultTitle).toBe("World V2");
    expect(stored.customMetadata?.entityCount).toBe("1");
  });

  it("should reject update if unauthorized or invalid token", async () => {
    // First publish
    const initBundle = validBundle({ vaultTitle: "World V1", entities: [] });
    const res1 = await worker.fetch(
      createRequest(
        "https://proxy.local/api/publish-vault",
        "POST",
        initBundle,
      ),
      env,
      ctx,
    );
    const data1 = (await res1.json()) as any;
    const publishId = data1.publishId;

    // Attempt update with wrong writeToken
    const updateBundle = validBundle({
      publishId,
      vaultTitle: "World V2",
      entities: [],
    });
    const res2 = await worker.fetch(
      createRequest(
        `https://proxy.local/api/publish-vault?publishId=${publishId}`,
        "POST",
        updateBundle,
        {
          Authorization: `Bearer wrong-token`,
        },
      ),
      env,
      ctx,
    );
    expect(res2.status).toBe(401);
  });

  it("should serve bundle on GET /api/published/:publishId/bundle", async () => {
    const publishId = "my-snapshot-id";
    const bundle = { publishId, vaultTitle: "Test World", entities: [] };
    await bucket.put(
      `published/${publishId}/bundle.json`,
      JSON.stringify(bundle),
      {
        contentType: "application/json",
      },
    );

    const res = await worker.fetch(
      createRequest(
        `https://proxy.local/api/published/${publishId}/bundle`,
        "GET",
      ),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");

    const fetchedBundle = await res.json();
    expect(fetchedBundle).toEqual(bundle);
  });

  it("should serve manifest on GET /api/published/:publishId/manifest", async () => {
    const publishId = "my-snapshot-id";
    const bundle = { publishId, vaultTitle: "Test World", entities: [] };
    await bucket.put(
      `published/${publishId}/bundle.json`,
      JSON.stringify(bundle),
      {
        contentType: "application/json",
        customMetadata: {
          vaultTitle: "Test World",
          publishedAt: "2026-06-22T22:00:00Z",
          entityCount: "5",
          relationshipCount: "10",
          assetCount: "2",
        },
      },
    );

    const res = await worker.fetch(
      createRequest(
        `https://proxy.local/api/published/${publishId}/manifest`,
        "GET",
      ),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    const manifest = (await res.json()) as any;
    expect(manifest.publishId).toBe(publishId);
    expect(manifest.vaultTitle).toBe("Test World");
    expect(manifest.entityCount).toBe(5);
    expect(manifest.relationshipCount).toBe(10);
    expect(manifest.assetCount).toBe(2);
  });

  it("should allow uploading assets with a valid token", async () => {
    const publishId = "my-snapshot-id";
    const writeToken = "asset-secret-token";
    // Create the bundle first
    await bucket.put(`published/${publishId}/bundle.json`, "{}", {
      customMetadata: { writeToken },
    });

    const assetData = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const res = await worker.fetch(
      new Request(
        `https://proxy.local/api/published/${publishId}/assets/img-123`,
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:5173",
            Authorization: `Bearer ${writeToken}`,
            "Content-Type": "image/png",
            "X-Filename": "logo.png",
          },
          body: assetData,
        },
      ),
      env,
      ctx,
    );

    expect(res.status).toBe(200);
    const resData = (await res.json()) as any;
    expect(resData.success).toBe(true);

    // Verify key in R2
    const key = `published/${publishId}/assets/img-123`;
    expect(bucket.store.has(key)).toBe(true);
    const item = bucket.store.get(key)!;
    expect(item.contentType).toBe("image/png");
    expect(item.customMetadata?.filename).toBe("img-123");
  });

  it("should reject scriptable or mismatched asset content", async () => {
    const publishId = "my-snapshot-id";
    const writeToken = "asset-secret-token";
    await bucket.put(`published/${publishId}/bundle.json`, "{}", {
      customMetadata: { writeToken },
    });

    const res = await worker.fetch(
      new Request(
        `https://proxy.local/api/published/${publishId}/assets/unsafe`,
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:5173",
            Authorization: `Bearer ${writeToken}`,
            "Content-Type": "text/html",
          },
          body: "<script>alert(1)</script>",
        },
      ),
      env,
      ctx,
    );

    expect(res.status).toBe(415);
    expect(bucket.store.has(`published/${publishId}/assets/unsafe`)).toBe(
      false,
    );
  });

  it("should fetch asset on GET /api/published/:publishId/assets/:assetId", async () => {
    const publishId = "my-snapshot-id";
    const assetId = "img-123";
    const key = `published/${publishId}/assets/${assetId}`;
    const assetData = new TextEncoder().encode("hello-image");

    await bucket.put(key, assetData, {
      contentType: "image/jpeg",
      customMetadata: { mimeType: "image/jpeg", filename: "test.jpg" },
    });

    const res = await worker.fetch(
      createRequest(
        `https://proxy.local/api/published/${publishId}/assets/${assetId}`,
        "GET",
      ),
      env,
      ctx,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const arrayBuffer = await res.arrayBuffer();
    expect(new Uint8Array(arrayBuffer)).toEqual(new Uint8Array(assetData));
  });

  it("should allow reading a published bundle without an Origin header", async () => {
    const publishId = "originless-snapshot";
    await bucket.put(
      `published/${publishId}/bundle.json`,
      JSON.stringify({
        publishId,
        vaultTitle: "Read Only World",
        entities: [],
      }),
      {
        contentType: "application/json",
      },
    );

    const res = await worker.fetch(
      new Request(`https://proxy.local/api/published/${publishId}/bundle`, {
        method: "GET",
      }),
      env,
      ctx,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      publishId,
      vaultTitle: "Read Only World",
      entities: [],
    });
  });

  it("should allow reading a published asset without an Origin header", async () => {
    const publishId = "originless-snapshot";
    const assetId = "img-123";
    const assetData = new TextEncoder().encode("hello-image");

    await bucket.put(`published/${publishId}/assets/${assetId}`, assetData, {
      contentType: "image/jpeg",
      customMetadata: { mimeType: "image/jpeg", filename: "test.jpg" },
    });

    const res = await worker.fetch(
      new Request(
        `https://proxy.local/api/published/${publishId}/assets/${assetId}`,
        {
          method: "GET",
        },
      ),
      env,
      ctx,
    );

    expect(res.status).toBe(200);
    const arrayBuffer = await res.arrayBuffer();
    expect(new Uint8Array(arrayBuffer)).toEqual(new Uint8Array(assetData));
  });

  it("should delete snapshot and all nested assets on DELETE", async () => {
    const publishId = "my-snapshot-id";
    const writeToken = "del-token";

    // Setup: bundle + 2 assets
    await bucket.put(`published/${publishId}/bundle.json`, "{}", {
      customMetadata: { writeToken },
    });
    await bucket.put(`published/${publishId}/assets/img1`, "img1-data");
    await bucket.put(`published/${publishId}/assets/img2`, "img2-data");
    await bucket.put(
      `directory/listings/${publishId}.json`,
      JSON.stringify({
        schemaVersion: 1,
        publishId,
        guestUrl: `/guest/${publishId}`,
        title: "Night Market",
        description: "Find smugglers and rumors.",
        labels: ["cyberpunk"],
        visibleEntityCount: 1,
        snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
        listingCreatedAt: "2026-06-30T12:00:00.000Z",
        listingUpdatedAt: "2026-06-30T12:00:00.000Z",
      }),
      {
        contentType: "application/json",
      },
    );

    const res = await worker.fetch(
      createRequest(
        `https://proxy.local/api/published/${publishId}`,
        "DELETE",
        null,
        {
          Authorization: `Bearer ${writeToken}`,
        },
      ),
      env,
      ctx,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    // Verify all keys are deleted
    expect(bucket.store.has(`published/${publishId}/bundle.json`)).toBe(false);
    expect(bucket.store.has(`published/${publishId}/assets/img1`)).toBe(false);
    expect(bucket.store.has(`published/${publishId}/assets/img2`)).toBe(false);
    expect(bucket.store.has(`directory/listings/${publishId}.json`)).toBe(
      false,
    );
  });

  it("should allow deleting individual assets with a valid token", async () => {
    const publishId = "my-snapshot-id";
    const writeToken = "del-token";

    // Setup: bundle + 1 asset
    await bucket.put(`published/${publishId}/bundle.json`, "{}", {
      customMetadata: { writeToken },
    });
    await bucket.put(`published/${publishId}/assets/img1`, "img1-data");

    const res = await worker.fetch(
      createRequest(
        `https://proxy.local/api/published/${publishId}/assets/img1`,
        "DELETE",
        null,
        {
          Authorization: `Bearer ${writeToken}`,
        },
      ),
      env,
      ctx,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    // Verify asset is deleted but bundle remains
    expect(bucket.store.has(`published/${publishId}/bundle.json`)).toBe(true);
    expect(bucket.store.has(`published/${publishId}/assets/img1`)).toBe(false);
  });
});
