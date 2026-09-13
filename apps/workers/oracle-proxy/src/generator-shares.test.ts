import { describe, expect, it } from "vitest";
import {
  getGeneratorShareKey,
  handleCreateGeneratorShare,
  handleDeleteGeneratorShare,
  handleGetGeneratorShare,
} from "./generator-shares";

function bucket() {
  const objects = new Map<
    string,
    { body: string; customMetadata?: Record<string, string> }
  >();
  return {
    objects,
    async put(
      key: string,
      body: string,
      options?: { customMetadata?: Record<string, string> },
    ) {
      objects.set(key, { body, customMetadata: options?.customMetadata });
    },
    async get(key: string) {
      const object = objects.get(key);
      return object
        ? {
            text: async () => object.body,
            customMetadata: object.customMetadata,
          }
        : null;
    },
    async head(key: string) {
      const object = objects.get(key);
      return object ? { customMetadata: object.customMetadata } : null;
    },
    async delete(key: string) {
      objects.delete(key);
    },
  };
}

function request(method: string, path: string, body?: unknown, token?: string) {
  return new Request(`https://oracle.example${path}`, {
    method,
    headers: {
      Origin: "https://codexcryptica.com",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const payload = {
  generatorId: "npc",
  title: "Mara Venn",
  content: "# Mara Venn\n\nA guide.",
  metadata: {
    description: "A guide.",
    generatorPath: "/generators/npc",
  },
};

describe("generator share worker handlers", () => {
  it("creates and reads an immutable public snapshot without exposing its token", async () => {
    const env = { BUCKET: bucket() };
    const created = await handleCreateGeneratorShare(
      request("POST", "/api/generator-shares", payload),
      env,
    );
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.managementToken).toBeTypeOf("string");

    const shareId = createdBody.share.shareId;
    const read = await handleGetGeneratorShare(
      request("GET", `/api/generator-shares/${shareId}`),
      env,
      shareId,
    );
    expect(read.status).toBe(200);
    const publicBody = await read.json();
    expect(publicBody).toEqual(createdBody.share);
    expect(publicBody).not.toHaveProperty("managementToken");
    expect(read.headers.get("X-Robots-Tag")).toBe("noindex, follow");
  });

  it("rejects an oversized payload before storing it", async () => {
    const env = { BUCKET: bucket() };
    const response = await handleCreateGeneratorShare(
      request("POST", "/api/generator-shares", {
        ...payload,
        content: "x".repeat(65_500),
      }),
      env,
    );
    expect(response.status).toBe(413);
    expect(env.BUCKET.objects.size).toBe(0);
  });

  it("requires the private token to revoke a snapshot", async () => {
    const env = { BUCKET: bucket() };
    const created = await handleCreateGeneratorShare(
      request("POST", "/api/generator-shares", payload),
      env,
    );
    const body = await created.json();
    const shareId = body.share.shareId;

    const denied = await handleDeleteGeneratorShare(
      request("DELETE", `/api/generator-shares/${shareId}`, undefined, "wrong"),
      env,
      shareId,
    );
    expect(denied.status).toBe(401);
    expect(env.BUCKET.objects.has(getGeneratorShareKey(shareId))).toBe(true);

    const deleted = await handleDeleteGeneratorShare(
      request(
        "DELETE",
        `/api/generator-shares/${shareId}`,
        undefined,
        body.managementToken,
      ),
      env,
      shareId,
    );
    expect(deleted.status).toBe(200);
    expect(env.BUCKET.objects.has(getGeneratorShareKey(shareId))).toBe(false);
  });
});
