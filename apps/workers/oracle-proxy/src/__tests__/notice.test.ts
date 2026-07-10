import { describe, expect, it, beforeEach } from "vitest";
import worker from "../index";

class MemoryKV {
  store = new Map<string, any>();

  async get(key: string): Promise<any | null> {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      text: async () => item.body,
      body: new TextEncoder().encode(item.body),
      customMetadata: item.customMetadata,
      uploaded: item.uploaded ?? new Date("2026-06-30T12:00:00.000Z"),
    };
  }

  async head(key: string): Promise<any | null> {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      customMetadata: item.customMetadata,
      uploaded: item.uploaded ?? new Date("2026-06-30T12:00:00.000Z"),
    };
  }

  async put(key: string, value: any, options?: any): Promise<void> {
    this.store.set(key, {
      body: typeof value === "string" ? value : JSON.stringify(value),
      customMetadata: options?.customMetadata || {},
      uploaded: new Date("2026-07-10T12:00:00.000Z"),
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(options?: { prefix?: string; cursor?: string; limit?: number }) {
    const prefix = options?.prefix || "";
    const keys: any[] = [];
    for (const [key, item] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        keys.push({
          key,
          customMetadata: item.customMetadata,
          uploaded: item.uploaded ?? new Date("2026-06-30T12:00:00.000Z"),
        });
      }
    }
    return {
      objects: keys,
      truncated: false,
    };
  }
}

function createRequest(
  url: string,
  method = "GET",
  body?: any,
  headers?: Record<string, string>,
): Request {
  return new Request(`https://oracle-proxy.espen-erlandsen.workers.dev${url}`, {
    method,
    headers: {
      Origin: "https://codex-cryptica.com",
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("notice routes and sidecar integration", () => {
  let bucket: MemoryKV;
  let env: any;
  const ctx = { waitUntil: () => {} };

  beforeEach(() => {
    bucket = new MemoryKV();
    env = {
      GEMINI_API_KEY: "test-api-key",
      BUCKET: bucket,
      ALLOWED_ORIGINS: "https://codex-cryptica.com",
    };

    // Seed a valid bundle
    bucket.store.set("published/pub-123/bundle.json", {
      body: JSON.stringify({
        schemaVersion: 1,
        publishId: "pub-123",
        vaultTitle: "Night Market",
        publishedAt: "2026-06-30T12:00:00.000Z",
        publisherVersion: "1.0.0",
        entities: [],
        relationships: [],
        assetManifest: [],
      }),
      customMetadata: {
        writeToken: "write-token-123",
      },
      uploaded: new Date("2026-06-30T12:00:00.000Z"),
    });
  });

  it("returns 404 on GET notice when snapshot bundle does not exist", async () => {
    const response = await worker.fetch(
      createRequest("/api/published/missing-pub/notice", "GET"),
      env,
      ctx,
    );
    expect(response.status).toBe(404);
  });

  it("returns default notice on GET when bundle exists but notice sidecar has not been saved yet", async () => {
    const response = await worker.fetch(
      createRequest("/api/published/pub-123/notice", "GET"),
      env,
      ctx,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      schemaVersion: 1,
      publishId: "pub-123",
      fanContent: false,
      updatedAt: "2026-06-30T12:00:00.000Z",
    });
  });

  it("returns 401 on PUT notice without valid authorization", async () => {
    const missingAuth = await worker.fetch(
      createRequest("/api/published/pub-123/notice", "PUT", {
        rightsAcknowledged: true,
        fanContent: true,
      }),
      env,
      ctx,
    );
    expect(missingAuth.status).toBe(401);

    const wrongAuth = await worker.fetch(
      createRequest(
        "/api/published/pub-123/notice",
        "PUT",
        {
          rightsAcknowledged: true,
          fanContent: true,
        },
        { Authorization: "Bearer wrong-token" },
      ),
      env,
      ctx,
    );
    expect(wrongAuth.status).toBe(401);
  });

  it("returns 400 on PUT notice when rightsAcknowledged is missing or false", async () => {
    const missingRights = await worker.fetch(
      createRequest(
        "/api/published/pub-123/notice",
        "PUT",
        { fanContent: true },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );
    expect(missingRights.status).toBe(400);

    const falseRights = await worker.fetch(
      createRequest(
        "/api/published/pub-123/notice",
        "PUT",
        { rightsAcknowledged: false, fanContent: true },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );
    expect(falseRights.status).toBe(400);
  });

  it("saves notice sidecar on valid PUT and returns it on GET", async () => {
    const putRes = await worker.fetch(
      createRequest(
        "/api/published/pub-123/notice",
        "PUT",
        {
          rightsAcknowledged: true,
          fanContent: true,
          fanContentDisclaimer: "Unofficial fan content. Not endorsed by WotC.",
        },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody.fanContent).toBe(true);
    expect(putBody.fanContentDisclaimer).toBe(
      "Unofficial fan content. Not endorsed by WotC.",
    );
    expect(putBody.rightsAcknowledgedAt).toBeDefined();

    const getRes = await worker.fetch(
      createRequest("/api/published/pub-123/notice", "GET"),
      env,
      ctx,
    );
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody).toEqual(putBody);
  });

  it("syncs notice sidecar when PUT /listing is invoked", async () => {
    const putListingRes = await worker.fetch(
      createRequest(
        "/api/published/pub-123/listing",
        "PUT",
        {
          title: "Night Market Fan Edition",
          description: "Smugglers in Cyber City.",
          labels: ["cyberpunk"],
          rightsAcknowledged: true,
          fanContent: true,
          fanContentDisclaimer: "Fan work.",
        },
        { Authorization: "Bearer write-token-123" },
      ),
      env,
      ctx,
    );
    expect(putListingRes.status).toBe(200);

    const noticeObj = await bucket.get("published/pub-123/notice.json");
    expect(noticeObj).not.toBeNull();
    const noticeJson = JSON.parse(await noticeObj!.text());
    expect(noticeJson.publishId).toBe("pub-123");
    expect(noticeJson.fanContent).toBe(true);
    expect(noticeJson.fanContentDisclaimer).toBe("Fan work.");
    expect(noticeJson.rightsAcknowledgedAt).toBeDefined();
  });
});
