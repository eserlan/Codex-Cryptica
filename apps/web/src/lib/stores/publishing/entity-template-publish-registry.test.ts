import { describe, expect, it } from "vitest";
import {
  EntityTemplatePublishRegistry,
  type SettingsKv,
} from "./entity-template-publish-registry";

function make() {
  const data = new Map<string, unknown>();
  const tokens = new Map<string, string>();
  const kv: SettingsKv = {
    get: async (k) => data.get(k),
    put: async (k, v) => void data.set(k, v),
    delete: async (k) => void data.delete(k),
    keys: async () => [...data.keys()],
  };
  const registry = new EntityTemplatePublishRegistry({
    kv,
    saveToken: async (id, t) => void tokens.set(id, t),
    getToken: async (id) => tokens.get(id),
    deleteToken: async (id) => void tokens.delete(id),
  });
  return { registry, data, tokens };
}

const link = (
  listingId: string,
  status: "active" | "unpublished" = "active",
) => ({
  listingId,
  status,
  publishedAt: "2026-03-01T00:00:00.000Z",
});

describe("EntityTemplatePublishRegistry", () => {
  it("links a template to a listing and saves the owner token through the token store", async () => {
    const { registry, tokens } = make();
    await registry.link("v1", "t1", link("L1"), "secret");
    expect(await registry.getLink("v1", "t1")).toEqual(link("L1"));
    expect(tokens.get("L1")).toBe("secret");
    expect(await registry.getOwnerToken("L1")).toBe("secret");
  });

  it("keeps links per vault", async () => {
    const { registry } = make();
    await registry.link("v1", "t1", link("L1"));
    expect(await registry.getLink("v2", "t1")).toBeUndefined();
    expect([...(await registry.linksForVault("v2")).keys()]).toEqual([]);
    expect([...(await registry.linksForVault("v1")).keys()]).toEqual(["t1"]);
  });

  it("relinking a listing to another template replaces the earlier link", async () => {
    const { registry } = make();
    await registry.link("v1", "t1", link("L1"));
    await registry.link("v1", "t2", link("L1"));
    expect(await registry.getLink("v1", "t1")).toBeUndefined();
    expect((await registry.getLink("v1", "t2"))?.listingId).toBe("L1");
  });

  it("replaces the link when a template is published again", async () => {
    const { registry } = make();
    await registry.link("v1", "t1", link("L1"));
    await registry.link("v1", "t1", link("L2"));
    expect((await registry.getLink("v1", "t1"))?.listingId).toBe("L2");
  });

  it("updates the status of an existing link and ignores an unknown one", async () => {
    const { registry } = make();
    await registry.link("v1", "t1", link("L1"));
    await registry.setStatus("v1", "t1", "unpublished");
    expect((await registry.getLink("v1", "t1"))?.status).toBe("unpublished");
    await registry.setStatus("v1", "nope", "unpublished");
    expect(await registry.getLink("v1", "nope")).toBeUndefined();
  });

  it("unlinks, and forgets the token only when asked", async () => {
    const { registry, tokens } = make();
    await registry.link("v1", "t1", link("L1"), "secret");
    await registry.unlink("v1", "t1");
    expect(await registry.getLink("v1", "t1")).toBeUndefined();
    expect(tokens.get("L1")).toBe("secret");
    await registry.link("v1", "t1", link("L1"), "secret");
    await registry.unlink("v1", "t1", { forgetToken: true });
    expect(tokens.has("L1")).toBe(false);
  });

  it("ignores malformed stored values", async () => {
    const { registry, data } = make();
    data.set("entityTemplatePublishLink:v1:t1", { nope: true });
    expect(await registry.getLink("v1", "t1")).toBeUndefined();
    expect((await registry.linksForVault("v1")).size).toBe(0);
  });

  it("remembers reported listings on the device", async () => {
    const { registry } = make();
    expect(await registry.hasReported("L1")).toBe(false);
    await registry.markReported("L1");
    expect(await registry.hasReported("L1")).toBe(true);
  });

  it("stores nothing outside its own keys, and no listing text", async () => {
    const { registry, data } = make();
    await registry.link("v1", "t1", link("L1"), "secret");
    expect([...data.keys()]).toEqual(["entityTemplatePublishLink:v1:t1"]);
    expect(JSON.stringify([...data.values()])).not.toContain("secret");
  });
});
