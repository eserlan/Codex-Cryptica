import { describe, expect, it } from "vitest";
import { load } from "./+page";

const validBundle = {
  schemaVersion: 1,
  publishId: "published-1",
  vaultTitle: "Shared World",
  publishedAt: "2026-06-23T00:00:00Z",
  publisherVersion: "1.0.0",
  activeTheme: {},
  entities: [
    { id: "entity-1", type: "note", title: "Welcome", status: "active" },
  ],
  relationships: [],
  maps: [],
  canvases: [],
  assetManifest: [],
};

describe("guest bundle loader", () => {
  it("accepts a valid published bundle", async () => {
    const result: any = await load({
      params: { publishId: "published-1" },
      fetch: async () => new Response(JSON.stringify(validBundle)),
    } as any);

    expect(result.status).toBe(200);
    expect(result.bundle).toMatchObject({ publishId: "published-1" });
  });

  it("rejects malformed or prototype-polluting bundles", async () => {
    const result: any = await load({
      params: { publishId: "published-1" },
      fetch: async () =>
        new Response(
          JSON.stringify({
            ...validBundle,
            entities: [{ ...validBundle.entities[0], id: "__proto__" }],
          }),
        ),
    } as any);

    expect(result.status).toBe(400);
    expect(result.bundle).toBeNull();
  });

  it("extracts UUID correctly from a slugified URL parameter", async () => {
    const uuid = "54429d8e-252c-40da-ab66-f9d91cb9a4ad";
    const slugified = `my-cool-vault-${uuid}`;
    let fetchedUrl = "";

    const result: any = await load({
      params: { publishId: slugified },
      fetch: async (url: string) => {
        fetchedUrl = url;
        return new Response(
          JSON.stringify({ ...validBundle, publishId: uuid }),
        );
      },
    } as any);

    expect(fetchedUrl).toContain(uuid);
    expect(result.publishId).toBe(uuid);
  });
});
