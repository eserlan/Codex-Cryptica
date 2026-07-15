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
  method = "POST",
  body: any = null,
  headers: Record<string, string> = {},
) {
  const defaultHeaders: Record<string, string> = {
    Origin: "https://codexcryptica.com",
    "Content-Type": "application/json",
    ...headers,
  };
  return new Request(url, {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : null,
  });
}

describe("POST /api/reports/copyright", () => {
  let bucket: MemoryKV;
  let env: any;
  let ctx: any;

  beforeEach(() => {
    bucket = new MemoryKV();
    env = {
      BUCKET: bucket,
      ALLOWED_ORIGINS: "https://codexcryptica.com",
    };
    ctx = {
      waitUntil: () => {},
    };
  });

  it("should validate required fields and return 400 when missing", async () => {
    const req = createRequest(
      "https://worker.dev/api/reports/copyright",
      "POST",
      {
        turnstileToken: "dev-turnstile-token",
        // missing vaultUrl and reporterContact
      },
    );
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error.message).toContain("Required");
  });

  it("should verify Turnstile token and return 403 on verification failure", async () => {
    const req = createRequest(
      "https://worker.dev/api/reports/copyright",
      "POST",
      {
        vaultUrl: "https://codexcryptica.com/guest/abc123",
        reporterContact: "legal@example.com",
        turnstileToken: "invalid-token",
      },
    );
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(403);
  });

  it("should persist copyright report to R2 and return receipt UUID on success", async () => {
    // Seed a directory listing so vaultState can be detected
    await bucket.put(
      "directory/listings/abc123.json",
      JSON.stringify({ publishId: "abc123" }),
    );

    const req = createRequest(
      "https://worker.dev/api/reports/copyright",
      "POST",
      {
        vaultUrl: "https://codexcryptica.com/guest/abc123",
        reporterContact: "legal@example.com",
        rightsHolder: "Acme Corp",
        material: "Our copyrighted lore book",
        details: "Exact copy on page 12",
        turnstileToken: "dev-turnstile-token",
      },
    );
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.reportId).toBeDefined();
    expect(typeof data.reportId).toBe("string");
    expect(data.receivedAt).toBeDefined();

    // Verify R2 persistence
    const reportObj = await bucket.get(
      `moderation/reports/${data.reportId}.json`,
    );
    expect(reportObj).not.toBeNull();
    const reportJson = JSON.parse(await reportObj.text());
    expect(reportJson.reportId).toBe(data.reportId);
    expect(reportJson.publishId).toBe("abc123");
    expect(reportJson.vaultState).toBe("listed");
    expect(reportJson.reporterContact).toBe("legal@example.com");
  });

  it("should enforce IP rate limiting when rate limit is exceeded", async () => {
    const limiter = {
      limit: async () => ({ success: false }),
    };
    const rateLimitedEnv = {
      ...env,
      PUBLISH_CREATE_RATE_LIMITER: limiter,
    };
    const req = createRequest(
      "https://worker.dev/api/reports/copyright",
      "POST",
      {
        vaultUrl: "https://codexcryptica.com/guest/abc123",
        reporterContact: "legal@example.com",
        turnstileToken: "dev-turnstile-token",
      },
    );
    const res = await worker.fetch(req, rateLimitedEnv, ctx);
    expect(res.status).toBe(429);
  });
});
