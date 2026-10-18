import { describe, it, expect, vi } from "vitest";
import { makeRepository, makeStore, draft } from "./test-helpers";
import { EntityTemplateError } from "./entity-template-store.svelte";
import { GENERIC_TEMPLATES } from "schema";

const storedUser = (over: Record<string, unknown> = {}) => ({
  version: 1,
  id: "u1",
  name: "Mine",
  entityType: "character",
  markdown: "## Mine A\n\nh\n",
  ...over,
});

const loaded = (over: Record<string, unknown> = {}) => ({
  templates: [],
  defaults: { version: 1, defaults: {} },
  legacy: [],
  warnings: [],
  ...over,
});

describe("EntityTemplateStore: loading and resolving", () => {
  it("lists built-in, legacy and user templates", async () => {
    const repository = makeRepository({
      loadAll: vi.fn().mockResolvedValue(
        loaded({
          templates: [storedUser()],
          legacy: [{ type: "location", markdown: "LEG" }],
        }),
      ),
    } as any);
    const { store, vault } = makeStore({ repository });
    await store.loadForVault("v1", { vault });
    const sources = store.list.map((t) => t.source);
    expect(sources).toContain("builtin");
    expect(sources).toContain("legacy");
    expect(sources).toContain("user");
    expect(store.list.find((t) => t.id === "legacy:location")?.markdown).toBe(
      "LEG",
    );
  });

  it("uses built-in templates before any vault has loaded", () => {
    const { store } = makeStore();
    expect(store.resolveSync("character")).toBe(GENERIC_TEMPLATES.character);
    expect(store.loaded).toBe(false);
  });

  it("resolveSync follows FR-018: chosen default, then legacy, then built-in", async () => {
    const repository = makeRepository({
      loadAll: vi.fn().mockResolvedValue(
        loaded({
          templates: [storedUser()],
          legacy: [{ type: "character", markdown: "LEGACY" }],
          defaults: { version: 1, defaults: { location: "builtin:location" } },
        }),
      ),
    } as any);
    const { store, vault } = makeStore({ repository });
    await store.loadForVault("v1", { vault });
    expect(store.resolveSync("character")).toBe("LEGACY");
    expect(store.resolveSync("location")).toBe(GENERIC_TEMPLATES.location);

    await store.setDefault("character", "u1");
    expect(store.resolveSync("character")).toBe("## Mine A\n\nh\n");
  });

  it("honours an explicit theme override for built-ins", async () => {
    const { store, vault } = makeStore();
    await store.loadForVault("v1", { vault });
    expect(store.resolveSync("character", "fantasy")).not.toBe(
      store.resolveSync("character", "workspace"),
    );
  });

  it("exposes warnings and still resolves when files were malformed", async () => {
    const repository = makeRepository({
      loadAll: vi
        .fn()
        .mockResolvedValue(loaded({ warnings: ['Skipped "bad.json"'] })),
    } as any);
    const { store, vault } = makeStore({ repository });
    await store.loadForVault("v1", { vault });
    expect(store.warnings).toEqual(['Skipped "bad.json"']);
    expect(store.resolveSync("character")).toBe(GENERIC_TEMPLATES.character);
  });

  it("falls back to built-ins with a warning when loading throws", async () => {
    const repository = makeRepository({
      loadAll: vi.fn().mockRejectedValue(new Error("disk")),
    } as any);
    const { store, vault } = makeStore({ repository });
    await store.loadForVault("v1", { vault });
    expect(store.warnings).toHaveLength(1);
    expect(store.loaded).toBe(true);
    expect(store.resolveSync("faction")).toBe(GENERIC_TEMPLATES.faction);
  });

  it("drops the previous vault's templates on a switch", async () => {
    const first = makeRepository({
      loadAll: vi.fn().mockResolvedValue(loaded({ templates: [storedUser()] })),
    } as any);
    const { store, vault } = makeStore({ repository: first });
    await store.loadForVault("v1", { vault });
    expect(store.list.some((t) => t.id === "u1")).toBe(true);

    (first.loadAll as any).mockResolvedValue(loaded());
    await store.loadForVault("v2", { vault });
    expect(store.list.some((t) => t.id === "u1")).toBe(false);
  });

  it("clears vault templates and defaults for guest sessions", async () => {
    const repository = makeRepository({
      loadAll: vi.fn().mockResolvedValue(
        loaded({
          templates: [storedUser()],
          legacy: [{ type: "character", markdown: "PRIVATE LEGACY" }],
          defaults: { version: 1, defaults: { character: "u1" } },
        }),
      ),
    } as any);
    const { store, vault } = makeStore({ repository });
    await store.loadForVault("v1", { vault });

    store.clearForGuest();

    expect(store.loaded).toBe(true);
    expect(store.canEdit).toBe(false);
    expect(store.list.some((t) => t.id === "u1")).toBe(false);
    expect(store.list.some((t) => t.id === "legacy:character")).toBe(false);
    expect(store.defaultFor("character")).toBeUndefined();
    expect(store.resolveSync("character")).toBe(GENERIC_TEMPLATES.character);
  });

  it("ignores a slow load that finished after a newer one started", async () => {
    let release!: (v: unknown) => void;
    const slow = new Promise((r) => (release = r));
    const loadAll = vi
      .fn()
      .mockReturnValueOnce(slow)
      .mockResolvedValueOnce(
        loaded({ templates: [storedUser({ id: "new" })] }),
      );
    const { store, vault } = makeStore({
      repository: makeRepository({ loadAll } as any),
    });
    const first = store.loadForVault("v1", { vault });
    await store.loadForVault("v2", { vault });
    release(loaded({ templates: [storedUser({ id: "stale" })] }));
    await first;
    expect(store.list.map((t) => t.id)).toContain("new");
    expect(store.list.map((t) => t.id)).not.toContain("stale");
  });
});

describe("EntityTemplateStore: effectiveDefaultFor", () => {
  it("is chosen, else legacy, else built-in: exactly one per type", async () => {
    const repository = makeRepository({
      loadAll: vi.fn().mockResolvedValue(
        loaded({
          templates: [storedUser()],
          legacy: [{ type: "location", markdown: "L" }],
          defaults: { version: 1, defaults: { character: "u1" } },
        }),
      ),
    } as any);
    const { store, vault } = makeStore({ repository });
    await store.loadForVault("v1", { vault });
    expect(store.effectiveDefaultFor("character")).toBe("u1");
    expect(store.effectiveDefaultFor("location")).toBe("legacy:location");
    expect(store.effectiveDefaultFor("faction")).toBe("builtin:faction");
    expect(store.defaultFor("faction")).toBeUndefined();
  });
});

describe("EntityTemplateStore: read-only and failures", () => {
  it("refuses every mutation when read-only and never touches the repository", async () => {
    const { store, repository, vault } = makeStore({ readOnly: true });
    await store.loadForVault("v1", { vault });
    expect(store.canEdit).toBe(false);
    await expect(store.create(draft())).rejects.toBeInstanceOf(
      EntityTemplateError,
    );
    await expect(
      store.setDefault("character", "builtin:character"),
    ).rejects.toThrow();
    await expect(store.remove("u1")).rejects.toThrow();
    await expect(store.update("u1", draft())).rejects.toThrow();
    await expect(store.duplicate("builtin:character")).rejects.toThrow();
    await expect(store.importPackage({})).rejects.toThrow();
    expect(repository.saveTemplate).not.toHaveBeenCalled();
    expect(repository.saveDefaults).not.toHaveBeenCalled();
    expect(repository.deleteTemplate).not.toHaveBeenCalled();
  });

  it("cannot edit when the vault has no writable handle", async () => {
    const { store } = makeStore();
    await store.loadForVault("v1", {});
    expect(store.canEdit).toBe(false);
    await expect(store.create(draft())).rejects.toThrow();
  });

  it("keeps the list unchanged and notifies when a write fails", async () => {
    const repository = makeRepository({
      saveTemplate: vi.fn().mockRejectedValue(new Error("quota")),
    } as any);
    const { store, notify, vault } = makeStore({ repository });
    await store.loadForVault("v1", { vault });
    const before = store.list.length;
    await expect(store.create(draft())).rejects.toThrow("quota");
    expect(store.list).toHaveLength(before);
    expect(notify).toHaveBeenCalledWith(expect.any(String), "error");
  });

  it("has no dependency on entities", () => {
    const { store } = makeStore();
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(store));
    expect(methods.join(" ")).not.toMatch(/entit(y|ies)(?!Template)/i);
  });

  describe("archetypes & contextual resolution", () => {
    it("templatesFor filters templates by entity type", async () => {
      const repository = makeRepository({
        loadAll: vi.fn().mockResolvedValue(
          loaded({
            templates: [
              storedUser({
                id: "guard",
                name: "City Guard",
                entityType: "character",
              }),
              storedUser({
                id: "dungeon",
                name: "Dungeon Outpost",
                entityType: "location",
              }),
            ],
          }),
        ),
      } as any);
      const { store, vault } = makeStore({ repository });
      await store.loadForVault("v1", { vault });

      const characterTemplates = store.templatesFor("character");
      expect(characterTemplates.some((t) => t.id === "guard")).toBe(true);
      expect(
        characterTemplates.every(
          (t) => t.entityType.toLowerCase() === "character",
        ),
      ).toBe(true);
      expect(characterTemplates.some((t) => t.id === "dungeon")).toBe(false);
    });

    it("resolveById returns markdown content for existing template or undefined for non-existing", async () => {
      const repository = makeRepository({
        loadAll: vi.fn().mockResolvedValue(
          loaded({
            templates: [
              storedUser({
                id: "guard",
                name: "City Guard",
                markdown: "## Duty Post\n",
              }),
            ],
          }),
        ),
      } as any);
      const { store, vault } = makeStore({ repository });
      await store.loadForVault("v1", { vault });

      expect(store.resolveById("guard")).toBe("## Duty Post\n");
      expect(store.resolveById("non-existent")).toBeUndefined();
    });

    it("contextualTemplateFor matches parent member_template by ID or case-insensitive name", async () => {
      const repository = makeRepository({
        loadAll: vi.fn().mockResolvedValue(
          loaded({
            templates: [
              storedUser({
                id: "syndicate-op",
                name: "Syndicate Operative",
                entityType: "character",
              }),
            ],
          }),
        ),
      } as any);
      const { store, vault } = makeStore({ repository });
      await store.loadForVault("v1", { vault });

      // Match by exact ID
      const byId = store.contextualTemplateFor("character", {
        member_template: "syndicate-op",
      });
      expect(byId?.id).toBe("syndicate-op");

      // Match by case-insensitive name
      const byName = store.contextualTemplateFor("character", {
        member_template: "syndicate operative",
      });
      expect(byName?.id).toBe("syndicate-op");

      // Match from metadata property
      const byMeta = store.contextualTemplateFor("character", {
        metadata: { member_template: "Syndicate Operative" },
      });
      expect(byMeta?.id).toBe("syndicate-op");

      // Negative: no match
      const noMatch = store.contextualTemplateFor("character", {
        member_template: "unknown-role",
      });
      expect(noMatch).toBeUndefined();

      // Negative: undefined parent
      expect(store.contextualTemplateFor("character", null)).toBeUndefined();
    });

    it("resolveContextual respects explicit templateId, then parent member_template, then default", async () => {
      const repository = makeRepository({
        loadAll: vi.fn().mockResolvedValue(
          loaded({
            templates: [
              storedUser({
                id: "guard",
                name: "Guard",
                markdown: "## Guard Body\n",
              }),
              storedUser({
                id: "syndicate-op",
                name: "Syndicate Op",
                markdown: "## Syndicate Body\n",
              }),
            ],
          }),
        ),
      } as any);
      const { store, vault } = makeStore({ repository });
      await store.loadForVault("v1", { vault });

      // 1. Explicit templateId wins over parent member_template
      const explicit = store.resolveContextual("character", {
        templateId: "guard",
        parentEntity: { member_template: "syndicate-op" },
      });
      expect(explicit).toBe("## Guard Body\n");

      // 2. Parent member_template is used when templateId is not provided
      const contextual = store.resolveContextual("character", {
        parentEntity: { member_template: "syndicate-op" },
      });
      expect(contextual).toBe("## Syndicate Body\n");

      // 3. Fallback to default when templateId is invalid and parent member_template is missing
      const fallback = store.resolveContextual("character", {
        templateId: "invalid-id",
        parentEntity: { member_template: "non-existent" },
      });
      expect(fallback).toBe(GENERIC_TEMPLATES.character);
    });
  });
});
