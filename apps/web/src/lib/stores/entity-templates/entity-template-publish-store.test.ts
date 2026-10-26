import { describe, expect, it, vi } from "vitest";
import { EntityTemplateDirectoryError } from "$lib/services/publishing/PublicEntityTemplateDirectoryService";
import {
  EntityTemplatePublishRegistry,
  type SettingsKv,
} from "$lib/stores/publishing/entity-template-publish-registry";
import { EntityTemplatePublishStore } from "./entity-template-publish-store.svelte";
import { makeStore, draft } from "./test-helpers";

const meta = {
  description: "A place for guilds.",
  labels: ["Fantasy"],
  ownerDisplayName: "Ada",
};
const listing = (
  id = "L1",
  status: "active" | "unpublished" = "active",
  over: object = {},
) => ({
  schemaVersion: 1,
  templateKind: "entity" as const,
  listingId: id,
  title: "Guild Hall",
  description: "d",
  entityType: "location",
  labels: ["Fantasy"],
  packageVersion: 1,
  status,
  listingCreatedAt: "2026-01-01T00:00:00.000Z",
  listingUpdatedAt: "2026-03-01T00:00:00.000Z",
  ...over,
});

async function setup(
  opts: { readOnly?: boolean; vaultId?: string | null } = {},
) {
  // Read-only is applied after the template exists (a read-only store cannot create).
  const storeOpts = { readOnly: false };
  const { store: templates, vault } = makeStore(storeOpts);
  await templates.loadForVault("v1", { vault });

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
    saveToken: async (i, t) => void tokens.set(i, t),
    getToken: async (i) => tokens.get(i),
    deleteToken: async (i) => void tokens.delete(i),
  });
  const service = {
    publishEntityTemplate: vi.fn(async () => ({
      listing: listing(),
      ownerToken: "tok",
    })),
    updateEntityTemplate: vi.fn(async () => listing()),
    unpublishEntityTemplate: vi.fn(async () => undefined),
    deleteEntityTemplate: vi.fn(async () => undefined),
    verifyOwner: vi.fn(async () => ({
      listing: listing(),
      package: {
        kind: "entity-template" as const,
        formatVersion: 1,
        template: {
          name: "Guild Hall",
          entityType: "location",
          markdown: "## Rooms\n",
        },
      },
    })),
  };
  const store = new EntityTemplatePublishStore({
    service: service as any,
    registry,
    templates,
    getVaultId: () => (opts.vaultId === undefined ? "v1" : opts.vaultId),
  });
  const mine = await templates.create(
    draft({
      name: "Guild Hall",
      entityType: "location",
      markdown: "## Rooms\n",
    }),
  );
  storeOpts.readOnly = opts.readOnly ?? false;
  return { store, templates, service, registry, tokens, data, mine };
}

describe("publishing", () => {
  it("links the template only after the worker confirms, and saves the token on the device", async () => {
    const { store, service, registry, tokens, mine } = await setup();
    const result = await store.publish(mine.id, meta);
    expect(result).toMatchObject({ ownerToken: "tok", linkSaved: true });
    expect(store.linkFor(mine.id)?.listingId).toBe("L1");
    expect(await registry.getLink("v1", mine.id)).toMatchObject({
      listingId: "L1",
      status: "active",
    });
    expect(tokens.get("L1")).toBe("tok");
    const sent = (service.publishEntityTemplate.mock.calls as any[][])[0][0];
    expect(sent.package).toEqual({
      kind: "entity-template",
      formatVersion: 1,
      template: {
        name: "Guild Hall",
        entityType: "location",
        markdown: "## Rooms\n",
      },
    });
    expect(sent).toMatchObject(meta);
  });

  it("leaves no link when publishing fails", async () => {
    const { store, service, registry, mine } = await setup();
    service.publishEntityTemplate.mockRejectedValueOnce(
      new EntityTemplateDirectoryError("Could not publish the template."),
    );
    await expect(store.publish(mine.id, meta)).rejects.toThrow(
      "Could not publish the template.",
    );
    expect(store.linkFor(mine.id)).toBeUndefined();
    expect(await registry.getLink("v1", mine.id)).toBeUndefined();
  });

  it("still returns the token if the device cannot save the link, so it is not lost", async () => {
    const { store, mine } = await setup();
    (store as any).deps.registry.link = vi
      .fn()
      .mockRejectedValue(new Error("storage full"));
    const result = await store.publish(mine.id, meta);
    expect(result).toMatchObject({ ownerToken: "tok", linkSaved: false });
  });

  it("validates before sending anything", async () => {
    const { store, service, mine } = await setup();
    await expect(
      store.publish(mine.id, { ...meta, labels: [] }),
    ).rejects.toThrow(/label/i);
    await expect(
      store.publish(mine.id, { ...meta, description: " " }),
    ).rejects.toThrow(/description/i);
    expect(service.publishEntityTemplate).not.toHaveBeenCalled();
  });

  it("refuses to publish an empty template", async () => {
    const { store, templates, service } = await setup();
    const empty = await templates.create(
      draft({ name: "Blank", entityType: "location", markdown: "" }),
    );
    await expect(store.publish(empty.id, meta)).rejects.toThrow(
      /nothing to share/i,
    );
    expect(service.publishEntityTemplate).not.toHaveBeenCalled();
  });

  it("cannot publish a built-in or legacy template directly", async () => {
    const { store, templates, service } = await setup();
    const builtin = templates.list.find((t) => t.source === "builtin")!;
    await expect(store.publish(builtin.id, meta)).rejects.toThrow(/duplicate/i);
    expect(store.publishState(builtin)).toEqual({ kind: "duplicate-first" });
    expect(service.publishEntityTemplate).not.toHaveBeenCalled();
  });

  it("offers update and unpublish, not publish, once published", async () => {
    const { store, mine } = await setup();
    expect(store.publishState(mine)).toEqual({ kind: "publish" });
    await store.publish(mine.id, meta);
    expect(store.publishState(mine).kind).toBe("published");
    await expect(store.publish(mine.id, meta)).rejects.toThrow(
      /already published/i,
    );
  });

  it("blocks every action in a read-only vault", async () => {
    const { store, mine } = await setup({ readOnly: true });
    expect(store.publishState(mine)).toEqual({ kind: "unavailable" });
    await expect(store.publish(mine.id, meta)).rejects.toThrow(
      /can't be published/i,
    );
    await expect(store.update(mine.id, meta)).rejects.toThrow();
    await expect(store.unpublish(mine.id)).rejects.toThrow();
    await expect(store.remove(mine.id)).rejects.toThrow();
    await expect(store.recover("L1", "tok")).rejects.toThrow();
  });
});

describe("managing a published template", () => {
  async function published() {
    const s = await setup();
    await s.store.publish(s.mine.id, meta);
    return s;
  }

  it("update sends the current template text, even after it was edited", async () => {
    const { store, templates, service, mine } = await published();
    await templates.update(
      mine.id,
      draft({
        name: "Guild Hall",
        entityType: "location",
        markdown: "## Changed\n",
      }),
    );
    await store.update(mine.id, { ...meta, description: "New words." });
    const [id, input, token] = (
      service.updateEntityTemplate.mock.calls as any[][]
    )[0];
    expect(id).toBe("L1");
    expect(token).toBe("tok");
    expect(input.package.template.markdown).toBe("## Changed\n");
    expect(input.description).toBe("New words.");
  });

  it("prefills the update form from the listing", async () => {
    const { store, mine, service } = await published();
    service.verifyOwner.mockResolvedValueOnce({
      listing: listing("L1", "active", {
        description: "Stored.",
        labels: ["A", "B"],
        ownerDisplayName: "Ada",
      }),
      package: {} as any,
    });
    expect(await store.loadOwnerMeta(mine.id)).toEqual({
      description: "Stored.",
      labels: ["A", "B"],
      ownerDisplayName: "Ada",
    });
  });

  it("unpublish records the status and republish reuses the same listing", async () => {
    const { store, mine, registry, service } = await published();
    await store.unpublish(mine.id);
    expect(store.linkFor(mine.id)?.status).toBe("unpublished");
    expect((await registry.getLink("v1", mine.id))?.status).toBe("unpublished");
    await store.update(mine.id, meta);
    expect(store.linkFor(mine.id)?.status).toBe("active");
    expect((service.updateEntityTemplate.mock.calls as any[][])[0][0]).toBe(
      "L1",
    );
    expect(service.publishEntityTemplate).toHaveBeenCalledTimes(1);
  });

  it("a failed unpublish keeps the status", async () => {
    const { store, mine, service } = await published();
    service.unpublishEntityTemplate.mockRejectedValueOnce(
      new EntityTemplateDirectoryError("Could not unpublish the template."),
    );
    await expect(store.unpublish(mine.id)).rejects.toThrow();
    expect(store.linkFor(mine.id)?.status).toBe("active");
  });

  it("delete clears the link and the token only after the worker confirms", async () => {
    const { store, mine, registry, tokens } = await published();
    await store.remove(mine.id);
    expect(store.linkFor(mine.id)).toBeUndefined();
    expect(await registry.getLink("v1", mine.id)).toBeUndefined();
    expect(tokens.has("L1")).toBe(false);
  });

  it("a failed delete keeps the link and token so it can be retried", async () => {
    const { store, mine, registry, tokens, service } = await published();
    service.deleteEntityTemplate.mockRejectedValueOnce(
      new EntityTemplateDirectoryError(
        "Could not delete the template listing.",
      ),
    );
    await expect(store.remove(mine.id)).rejects.toThrow();
    expect(store.linkFor(mine.id)?.listingId).toBe("L1");
    expect(await registry.getLink("v1", mine.id)).toBeDefined();
    expect(tokens.get("L1")).toBe("tok");
    await store.remove(mine.id);
    expect(store.linkFor(mine.id)).toBeUndefined();
  });

  it("deleting the local template keeps the link, so the listing can still be managed", async () => {
    const { store, templates, mine, registry } = await published();
    await templates.remove(mine.id);
    expect(store.linkFor(mine.id)?.listingId).toBe("L1");
    expect(await registry.getLink("v1", mine.id)).toBeDefined();
  });

  it("an operator removal surfaces as a distinct error and changes nothing", async () => {
    const { store, mine, service } = await published();
    service.updateEntityTemplate.mockRejectedValueOnce(
      new EntityTemplateDirectoryError("removed", "removed_by_operator"),
    );
    await expect(store.update(mine.id, meta)).rejects.toMatchObject({
      code: "removed_by_operator",
    });
    expect(store.linkFor(mine.id)?.status).toBe("active");
  });

  it("explains a missing token on this device", async () => {
    const { store, mine, tokens } = await published();
    tokens.clear();
    await expect(store.unpublish(mine.id)).rejects.toThrow(/owner token/i);
  });

  it("shows a template as unpublished on another device", async () => {
    const first = await published();
    // A second device shares the vault's templates but not this device's registry.
    const second = new EntityTemplatePublishStore({
      service: first.service as any,
      registry: new EntityTemplatePublishRegistry({
        kv: {
          get: async () => undefined,
          put: async () => {},
          delete: async () => {},
          keys: async () => [],
        },
        saveToken: async () => {},
        getToken: async () => undefined,
        deleteToken: async () => {},
      }),
      templates: first.templates,
      getVaultId: () => "v1",
    });
    await second.loadLinks();
    expect(second.publishState(first.mine)).toEqual({ kind: "publish" });
  });

  it("loads the vault's links from the device", async () => {
    const { store, mine } = await published();
    (store as any).links = {};
    await store.loadLinks();
    expect(store.linkFor(mine.id)?.listingId).toBe("L1");
  });
});

describe("recovering owner controls", () => {
  it("relinks automatically when exactly one local template matches", async () => {
    const { store, mine, registry, tokens } = await setup();
    const result = await store.recover("L1", " tok ");
    expect(result).toMatchObject({ status: "linked", templateId: mine.id });
    expect(store.linkFor(mine.id)?.listingId).toBe("L1");
    expect((await registry.getLink("v1", mine.id))?.listingId).toBe("L1");
    expect(tokens.get("L1")).toBe("tok");
  });

  it("asks the user to choose when several templates match", async () => {
    const { store, templates } = await setup();
    await templates.create(
      draft({ name: "guild hall", entityType: "Location", markdown: "x" }),
    );
    const result = await store.recover("L1", "tok");
    expect(result.status).toBe("choose");
    expect(result.status === "choose" && result.candidates).toHaveLength(2);
    expect(store.links).toEqual({});
    await store.relink("L1", (result as any).candidates[1].id);
    expect(Object.values(store.links)[0].listingId).toBe("L1");
  });

  it("offers to install a copy when nothing matches, and links it", async () => {
    const { store, templates, mine } = await setup();
    await templates.update(
      mine.id,
      draft({ name: "Something else", entityType: "location", markdown: "y" }),
    );
    const result = await store.recover("L1", "tok");
    expect(result.status).toBe("none");
    const created = await store.installCopyAndLink("L1");
    expect(created.markdown).toBe("## Rooms\n");
    expect(store.linkFor(created.id)?.listingId).toBe("L1");
  });

  it("recovers an unpublished listing with its status", async () => {
    const { store, service, mine } = await setup();
    service.verifyOwner.mockResolvedValueOnce({
      listing: listing("L1", "unpublished"),
      package: {
        kind: "entity-template",
        formatVersion: 1,
        template: {
          name: "Guild Hall",
          entityType: "location",
          markdown: "## Rooms\n",
        },
      },
    });
    await store.recover("L1", "tok");
    expect(store.linkFor(mine.id)?.status).toBe("unpublished");
  });

  it("links and saves nothing for a wrong token or an operator-removed listing", async () => {
    for (const code of ["unauthorized", "removed_by_operator"] as const) {
      const { store, service, registry, tokens, mine } = await setup();
      service.verifyOwner.mockRejectedValueOnce(
        new EntityTemplateDirectoryError("nope", code),
      );
      await expect(store.recover("L1", "bad")).rejects.toMatchObject({ code });
      expect(store.linkFor(mine.id)).toBeUndefined();
      expect(await registry.getLink("v1", mine.id)).toBeUndefined();
      expect(tokens.size).toBe(0);
    }
  });

  it("relinking a listing moves it from any earlier template in this vault", async () => {
    const { store, templates, mine } = await setup();
    await store.recover("L1", "tok");
    const other = await templates.create(
      draft({ name: "Another", entityType: "location", markdown: "z" }),
    );
    await store.relink("L1", other.id);
    expect(store.linkFor(mine.id)).toBeUndefined();
    expect(store.linkFor(other.id)?.listingId).toBe("L1");
  });
});

describe("owner actions by listing (used on the listing page)", () => {
  it("reports whether this device holds the token and the listing's status", async () => {
    const { store, mine, service, tokens } = await setup();
    expect(await store.hasOwnerToken("L1")).toBe(false);
    await store.publish(mine.id, meta);
    expect(await store.hasOwnerToken("L1")).toBe(true);
    service.verifyOwner.mockResolvedValueOnce({
      listing: listing("L1", "unpublished"),
      package: {} as any,
    });
    expect(await store.ownerStatus("L1")).toBe("unpublished");
    tokens.clear();
    await expect(store.ownerStatus("L1")).rejects.toThrow(/owner token/i);
  });

  it("republishes with the text and details the listing already has", async () => {
    const { store, mine, service } = await setup();
    await store.publish(mine.id, meta);
    await store.unpublishListing("L1");
    expect(store.linkFor(mine.id)?.status).toBe("unpublished");
    service.verifyOwner.mockResolvedValueOnce({
      listing: listing("L1", "unpublished", {
        description: "Kept.",
        labels: ["Kept"],
      }),
      package: {
        kind: "entity-template",
        formatVersion: 1,
        template: {
          name: "Guild Hall",
          entityType: "location",
          markdown: "## Kept\n",
        },
      },
    });
    await store.republishListing("L1");
    const [id, input, token] = (
      service.updateEntityTemplate.mock.calls as any[][]
    ).at(-1)!;
    expect(id).toBe("L1");
    expect(token).toBe("tok");
    expect(input.package.template.markdown).toBe("## Kept\n");
    expect(input).toMatchObject({ description: "Kept.", labels: ["Kept"] });
    expect(store.linkFor(mine.id)?.status).toBe("active");
  });

  it("deletes a listing that no template is linked to, and forgets its token", async () => {
    const { store, service, registry, tokens } = await setup();
    await registry.saveOwnerToken("L9", "tok9");
    await store.deleteListing("L9");
    expect(service.deleteEntityTemplate).toHaveBeenCalledWith("L9", "tok9");
    expect(tokens.has("L9")).toBe(false);
  });

  it("does nothing locally if the worker refuses", async () => {
    const { store, mine, service, tokens } = await setup();
    await store.publish(mine.id, meta);
    service.unpublishEntityTemplate.mockRejectedValueOnce(
      new EntityTemplateDirectoryError("removed", "removed_by_operator"),
    );
    await expect(store.unpublishListing("L1")).rejects.toMatchObject({
      code: "removed_by_operator",
    });
    service.deleteEntityTemplate.mockRejectedValueOnce(
      new EntityTemplateDirectoryError("removed", "removed_by_operator"),
    );
    await expect(store.deleteListing("L1")).rejects.toMatchObject({
      code: "removed_by_operator",
    });
    expect(store.linkFor(mine.id)?.status).toBe("active");
    expect(tokens.get("L1")).toBe("tok");
  });
});
