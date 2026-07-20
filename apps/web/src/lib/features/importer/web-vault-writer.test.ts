import { describe, expect, it, vi } from "vitest";
import { ImportEngine, parseScabardExport } from "@codex/importer";
import { WebVaultWriter } from "./web-vault-writer";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("WebVaultWriter", () => {
  it("finds an entity by exact discoverySource match", async () => {
    const writer = new WebVaultWriter({
      entities: {
        hero: {
          id: "hero",
          discoverySource: "scabard:id:123",
        },
      },
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      addConnection: vi.fn(),
    });

    await expect(writer.findBySourceRef("scabard:id:123")).resolves.toEqual({
      id: "hero",
    });
    await expect(writer.findBySourceRef("scabard:id:999")).resolves.toBeNull();
  });

  it("maps labels separately from tags when creating entities", async () => {
    const createEntity = vi.fn().mockResolvedValue("hero");
    const writer = new WebVaultWriter({
      entities: {},
      createEntity,
      updateEntity: vi.fn(),
      addConnection: vi.fn(),
    });

    const result = await writer.createEntity({
      type: "character",
      title: "Hero",
      content: "Lore",
      tags: [],
      labels: ["important", "npc"],
      image: "https://cdn.example.com/hero.png",
      thumbnail: "https://cdn.example.com/hero-thumb.png",
      discoverySource: "scabard:id:1",
    });

    expect(result).toEqual({ id: "hero" });
    expect(createEntity).toHaveBeenCalledWith("character", "Hero", {
      content: "Lore",
      lore: undefined,
      tags: [],
      labels: ["important", "npc"],
      image: "https://cdn.example.com/hero.png",
      thumbnail: "https://cdn.example.com/hero-thumb.png",
      metadata: undefined,
      discoverySource: "scabard:id:1",
      parent: undefined,
      connections: [],
    });
  });

  it("uses batchCreateEntities when the vault store supports it", async () => {
    const batchCreateEntities = vi.fn(async (_entities) => {
      store.entities.hero = {
        id: "hero",
        title: "Hero",
        discoverySource: "scabard:id:1",
      };
      store.entities.harbor = {
        id: "harbor",
        title: "Moon Harbor",
        discoverySource: "scabard:id:2",
      };
    });
    const store = {
      entities: {} as Record<string, any>,
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      batchCreateEntities,
      addConnection: vi.fn(),
    };
    const writer = new WebVaultWriter(store);

    const result = await writer.batchCreateEntities([
      {
        type: "character",
        title: "Hero",
        content: "Lore",
        tags: [],
        labels: ["important"],
        image: "https://cdn.example.com/hero.png",
        thumbnail: "https://cdn.example.com/hero-thumb.png",
        discoverySource: "scabard:id:1",
      },
      {
        type: "location",
        title: "Moon Harbor",
        content: "Harbor note",
        tags: [],
        labels: ["port"],
        discoverySource: "scabard:id:2",
      },
    ]);

    expect(batchCreateEntities).toHaveBeenCalledWith([
      {
        type: "character",
        title: "Hero",
        initialData: {
          content: "Lore",
          lore: undefined,
          tags: [],
          labels: ["important"],
          image: "https://cdn.example.com/hero.png",
          thumbnail: "https://cdn.example.com/hero-thumb.png",
          metadata: undefined,
          discoverySource: "scabard:id:1",
          parent: undefined,
          connections: [],
        },
      },
      {
        type: "location",
        title: "Moon Harbor",
        initialData: {
          content: "Harbor note",
          lore: undefined,
          tags: [],
          labels: ["port"],
          image: undefined,
          thumbnail: undefined,
          metadata: undefined,
          discoverySource: "scabard:id:2",
          parent: undefined,
          connections: [],
        },
      },
    ]);
    expect(result).toEqual([{ id: "hero" }, { id: "harbor" }]);
  });

  it("updates labels separately from tags", async () => {
    const updateEntity = vi.fn().mockResolvedValue(true);
    const writer = new WebVaultWriter({
      entities: {},
      createEntity: vi.fn(),
      updateEntity,
      addConnection: vi.fn(),
    });

    await writer.updateEntity("hero", {
      title: "Updated Hero",
      labels: ["story"],
      image: "https://cdn.example.com/updated.png",
    });

    expect(updateEntity).toHaveBeenCalledWith("hero", {
      type: undefined,
      title: "Updated Hero",
      content: undefined,
      lore: undefined,
      tags: undefined,
      labels: ["story"],
      image: "https://cdn.example.com/updated.png",
      thumbnail: undefined,
      metadata: undefined,
      parent: undefined,
    });
  });

  it("throws when updating a missing entity", async () => {
    const writer = new WebVaultWriter({
      entities: {},
      createEntity: vi.fn(),
      updateEntity: vi.fn().mockResolvedValue(false),
      addConnection: vi.fn(),
    });

    await expect(
      writer.updateEntity("missing", { title: "Nope" }),
    ).rejects.toThrow("Entity missing not found");
  });

  it("appends one-directional connections through addConnection", async () => {
    const addConnection = vi.fn().mockResolvedValue(true);
    const writer = new WebVaultWriter({
      entities: {
        hero: {
          id: "hero",
          connections: [{ target: "inn", type: "visited", strength: 1 }],
        },
      },
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      addConnection,
    });

    await writer.appendConnection("hero", {
      target: "town",
      type: "located_in",
      label: "Located In",
    });

    expect(addConnection).toHaveBeenCalledWith(
      "hero",
      "town",
      "located_in",
      "Located In",
      1,
    );
  });

  it("does not duplicate an existing imported connection", async () => {
    const addConnection = vi.fn().mockResolvedValue(true);
    const writer = new WebVaultWriter({
      entities: {
        hero: {
          id: "hero",
          connections: [
            {
              target: "town",
              type: "located_in",
              label: "Located In",
              strength: 1,
            },
          ],
        },
      },
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      addConnection,
    });

    await writer.appendConnection("hero", {
      target: "town",
      type: "located_in",
      label: "Located In",
    });

    expect(addConnection).not.toHaveBeenCalled();
  });

  it("reports asset persistence as unsupported when the store can't save images", async () => {
    const writer = new WebVaultWriter({
      entities: {},
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      addConnection: vi.fn(),
    });

    await expect(
      writer.saveAsset({
        bytes: new Blob(["x"]),
        originalName: "map.png",
        mimeType: "image/png",
        entityId: "hero",
      }),
    ).rejects.toThrow("does not support image asset persistence");
  });

  it("saves an asset with a content-addressed name and attaches it to the entity", async () => {
    const saveImageToVault = vi
      .fn()
      .mockResolvedValue({ image: "images/cif_ab.webp", thumbnail: "t.webp" });
    const updateEntity = vi.fn().mockResolvedValue(true);
    const writer = new WebVaultWriter({
      entities: { hero: { id: "hero" } },
      createEntity: vi.fn(),
      updateEntity,
      addConnection: vi.fn(),
      saveImageToVault,
    });

    const result = await writer.saveAsset({
      bytes: new Uint8Array([1, 2, 3]),
      originalName: "lyra.png",
      mimeType: "image/png",
      entityId: "hero",
      contentHash: "abcdef0123456789ffff",
    });

    expect(saveImageToVault).toHaveBeenCalledTimes(1);
    const [blob, entityId, name] = saveImageToVault.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(entityId).toBe("hero");
    expect(name).toBe("cif_abcdef0123456789");
    expect(updateEntity).toHaveBeenCalledWith("hero", {
      image: "images/cif_ab.webp",
      thumbnail: "t.webp",
    });
    expect(result.ref).toBe("images/cif_ab.webp");
  });

  it("keeps an entity's existing image instead of overwriting it", async () => {
    const saveImageToVault = vi.fn();
    const updateEntity = vi.fn();
    const writer = new WebVaultWriter({
      entities: { hero: { id: "hero", image: "images/mine.webp" } },
      createEntity: vi.fn(),
      updateEntity,
      addConnection: vi.fn(),
      saveImageToVault,
    });

    const result = await writer.saveAsset({
      bytes: new Uint8Array([1, 2, 3]),
      originalName: "lyra.png",
      mimeType: "image/png",
      entityId: "hero",
      contentHash: "abc",
    });

    expect(saveImageToVault).not.toHaveBeenCalled();
    expect(updateEntity).not.toHaveBeenCalled();
    expect(result.ref).toBe("images/mine.webp");
  });

  it("does not attach a reference when the save itself fails", async () => {
    const saveImageToVault = vi.fn().mockRejectedValue(new Error("quota"));
    const updateEntity = vi.fn();
    const writer = new WebVaultWriter({
      entities: { hero: { id: "hero" } },
      createEntity: vi.fn(),
      updateEntity,
      addConnection: vi.fn(),
      saveImageToVault,
    });

    await expect(
      writer.saveAsset({
        bytes: new Uint8Array([1]),
        originalName: "lyra.png",
        mimeType: "image/png",
        entityId: "hero",
      }),
    ).rejects.toThrow("quota");
    expect(updateEntity).not.toHaveBeenCalled();
  });
});

describe("WebVaultWriter integration with ImportEngine", () => {
  it("supports create, update, and connection append through the engine", async () => {
    const store = {
      entities: {
        existing: {
          id: "existing",
          title: "Existing Hero",
          discoverySource: "scabard:item:hero-1",
          tags: ["old-tag"],
          labels: ["old-tag"],
          connections: [],
        },
      } as Record<string, any>,
      createEntity: vi
        .fn()
        .mockImplementation(async (_type, title, initial) => {
          const id = title.toLowerCase().replace(/\s+/g, "-");
          store.entities[id] = {
            id,
            title,
            ...initial,
            connections: initial?.connections ?? [],
          };
          return id;
        }),
      updateEntity: vi.fn().mockImplementation(async (id, updates) => {
        const existing = store.entities[id];
        if (!existing) return false;
        store.entities[id] = { ...existing, ...updates };
        return true;
      }),
      addConnection: vi
        .fn()
        .mockImplementation(async (sourceId, targetId, type, label) => {
          const source = store.entities[sourceId];
          if (!source) return false;
          source.connections = [
            ...(source.connections ?? []),
            { target: targetId, type, label, strength: 1 },
          ];
          return true;
        }),
    };

    const engine = new ImportEngine({
      writer: new WebVaultWriter(store as any),
    });
    const session = await engine.prepare({
      version: "1.0",
      sourceSystem: "scabard",
      sourceLabel: "Scabard Campaign 1",
      entityDrafts: [
        {
          sourceId: "hero-1",
          title: "Existing Hero",
          content: "Updated content",
          tags: [],
          labels: ["story"],
        },
        {
          sourceId: "town-1",
          title: "Moon Harbor",
          content: "Harbor note",
          tags: [],
          labels: ["port"],
        },
      ],
      relationshipDrafts: [
        {
          fromRef: "hero-1",
          toRef: "town-1",
          type: "located_in",
          label: "Located In",
        },
      ],
      assetDrafts: [],
      warnings: [],
    });

    session.items[0].matchDecision = "update";

    const report = await engine.commit(session);

    expect(report.entitiesUpdated).toBe(1);
    expect(report.entitiesCreated).toBe(1);
    expect(report.relationshipsCreated).toBe(1);
    expect(store.entities.existing.labels).toEqual(["story"]);
    expect(store.entities["moon-harbor"].labels).toEqual(["port"]);
    expect(store.entities.existing.connections).toEqual([
      {
        target: "moon-harbor",
        type: "located_in",
        label: "Located In",
        strength: 1,
      },
    ]);
  });

  it("imports the real london-calling-campaign Scabard JSON and sets up all connections correctly in the store", async () => {
    const jsonPath = resolve(
      __dirname,
      "../../../../../../packages/importer/tests/cc/fixtures/london-calling-campaign.json",
    );
    const rawData = readFileSync(jsonPath, "utf-8");
    const pkg = parseScabardExport(rawData);

    const store = {
      entities: {} as Record<string, any>,
      createEntity: vi
        .fn()
        .mockImplementation(async (_type, title, initial) => {
          const id = title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
          store.entities[id] = {
            id,
            title,
            ...initial,
            connections: initial?.connections ?? [],
          };
          return id;
        }),
      updateEntity: vi.fn().mockImplementation(async (id, updates) => {
        const existing = store.entities[id];
        if (!existing) return false;
        store.entities[id] = { ...existing, ...updates };
        return true;
      }),
      addConnection: vi
        .fn()
        .mockImplementation(async (sourceId, targetId, type, label) => {
          const source = store.entities[sourceId];
          if (!source) return false;
          source.connections = [
            ...(source.connections ?? []),
            { target: targetId, type, label, strength: 1 },
          ];
          return true;
        }),
    };

    const engine = new ImportEngine({
      writer: new WebVaultWriter(store as any),
    });
    const session = await engine.prepare(pkg);
    const report = await engine.commit(session);

    // Verify stats
    expect(report.failures.length).toBe(0);
    expect(report.entitiesCreated).toBe(pkg.entityDrafts.length);
    expect(report.relationshipsCreated).toBe(7); // 7 valid connections

    // Verify Benjamin Bowman's connections
    const benjamin = store.entities["benjamin-bowman"];
    expect(benjamin).toBeDefined();
    expect(benjamin.connections.length).toBe(2);

    expect(benjamin.connections[0]).toEqual({
      target: "the-coterie",
      type: "member_of",
      label: "Member Of",
      strength: 1,
    });

    expect(benjamin.connections[1]).toEqual({
      target: "1---chapter-one-the-ghost-town",
      type: "participant_of",
      label: "Participant Of",
      strength: 1,
    });
  });
});

describe("WebVaultWriter — dates and aliases (T008)", () => {
  it("maps startDate/endDate to legacy temporal metadata and passes aliases through on create", async () => {
    const createEntity = vi.fn().mockResolvedValue("hero");
    const writer = new WebVaultWriter({
      entities: {},
      createEntity,
      updateEntity: vi.fn(),
      addConnection: vi.fn(),
    });

    await writer.createEntity({
      type: "character",
      title: "Hero",
      content: "Lore",
      tags: [],
      aliases: ["The Wanderer"],
      startDate: { year: 1142 },
      endDate: { year: 1150, month: 3, day: 18 },
      discoverySource: "cif:entity:tool:world:hero",
    });

    expect(createEntity).toHaveBeenCalledWith(
      "character",
      "Hero",
      expect.objectContaining({
        aliases: ["The Wanderer"],
        start_date: { year: 1142, month: undefined, day: undefined },
        end_date: { year: 1150, month: 3, day: 18 },
      }),
    );
  });

  it("omits temporal metadata when no dates are provided", async () => {
    const createEntity = vi.fn().mockResolvedValue("hero");
    const writer = new WebVaultWriter({
      entities: {},
      createEntity,
      updateEntity: vi.fn(),
      addConnection: vi.fn(),
    });

    await writer.createEntity({
      type: "character",
      title: "Hero",
      content: "Lore",
      tags: [],
      discoverySource: "cif:entity:tool:world:hero",
    });

    const call = createEntity.mock.calls[0][2];
    expect(call.start_date).toBeUndefined();
    expect(call.end_date).toBeUndefined();
    expect(call.aliases).toBeUndefined();
  });

  it("maps dates and aliases on update", async () => {
    const updateEntity = vi.fn().mockResolvedValue(true);
    const writer = new WebVaultWriter({
      entities: { hero: { id: "hero" } },
      createEntity: vi.fn(),
      updateEntity,
      addConnection: vi.fn(),
    });

    await writer.updateEntity("hero", {
      aliases: ["The Wanderer"],
      startDate: { year: 1142 },
    });

    expect(updateEntity).toHaveBeenCalledWith(
      "hero",
      expect.objectContaining({
        aliases: ["The Wanderer"],
        start_date: { year: 1142, month: undefined, day: undefined },
      }),
    );
  });
});

describe("WebVaultWriter — getEntityFields (T018)", () => {
  it("returns current comparable fields for an existing entity", async () => {
    const writer = new WebVaultWriter({
      entities: {
        hero: {
          id: "hero",
          title: "Hero",
          content: "Short desc",
          lore: "Long lore",
          labels: ["pirate"],
          aliases: ["The Wanderer"],
          type: "character",
          parent: "parent-id",
          start_date: { year: 1142, month: 7, day: 18 },
        },
      },
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      addConnection: vi.fn(),
    });

    await expect(writer.getEntityFields("hero")).resolves.toEqual({
      title: "Hero",
      content: "Short desc",
      lore: "Long lore",
      labels: ["pirate"],
      aliases: ["The Wanderer"],
      type: "character",
      parent: "parent-id",
      startDate: { year: 1142, month: 7, day: 18 },
      endDate: undefined,
    });
  });

  it("returns null for a missing entity", async () => {
    const writer = new WebVaultWriter({
      entities: {},
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      addConnection: vi.fn(),
    });

    await expect(writer.getEntityFields("missing")).resolves.toBeNull();
  });
});

describe("WebVaultWriter — titleFallback option (T018/FR-014)", () => {
  it("titleFallback:false makes findBySourceRef exact-match only, even for a renamed vault entity", async () => {
    const writer = new WebVaultWriter(
      {
        entities: {
          hero: { id: "hero", discoverySource: "cif:entity:tool:world:hero" },
        },
        createEntity: vi.fn(),
        updateEntity: vi.fn(),
        addConnection: vi.fn(),
      },
      { titleFallback: false },
    );
    writer.associateDrafts?.([
      { sourceRef: "cif:entity:tool:world:hero", title: "Renamed Hero" },
    ]);

    // Exact sourceRef match still works (the entity's title changed in the
    // vault since the original import, but discoverySource didn't).
    await expect(
      writer.findBySourceRef("cif:entity:tool:world:hero"),
    ).resolves.toEqual({ id: "hero" });

    // No fallback: a sourceRef this vault has never seen must not match
    // anything by title, even if some other entity happens to share a title.
    await expect(
      writer.findBySourceRef("cif:entity:tool:world:someone-else"),
    ).resolves.toBeNull();
  });

  it("titleFallback:false does not match a same-titled but different entity by title alone", async () => {
    const writer = new WebVaultWriter(
      {
        entities: {
          "existing-hero": { id: "existing-hero", title: "Hero" },
        },
        createEntity: vi.fn(),
        updateEntity: vi.fn(),
        addConnection: vi.fn(),
      },
      { titleFallback: false },
    );
    // A brand-new draft that merely shares a title with an unrelated entity —
    // with title fallback disabled this must never match "existing-hero".
    writer.associateDrafts?.([
      { sourceRef: "cif:entity:tool:world:new-hero", title: "Hero" },
    ]);

    await expect(
      writer.findBySourceRef("cif:entity:tool:world:new-hero"),
    ).resolves.toBeNull();
  });

  it("default titleFallback:true preserves legacy title-matching behavior", async () => {
    const writer = new WebVaultWriter({
      entities: {
        hero: { id: "hero", title: "Hero" },
      },
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      addConnection: vi.fn(),
    });
    writer.associateDrafts?.([{ sourceRef: "scabard:id:123", title: "Hero" }]);

    await expect(writer.findBySourceRef("scabard:id:123")).resolves.toEqual({
      id: "hero",
    });
  });
});

describe("WebVaultWriter — appendConnection return value (T018/FR-013)", () => {
  it("returns {created:true} for a newly appended connection", async () => {
    const addConnection = vi.fn().mockResolvedValue(true);
    const writer = new WebVaultWriter({
      entities: { hero: { id: "hero", connections: [] } },
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      addConnection,
    });

    await expect(
      writer.appendConnection("hero", { target: "town", type: "located_in" }),
    ).resolves.toEqual({ created: true });
  });

  it("returns {created:false} idempotently for an already-present connection", async () => {
    const addConnection = vi.fn().mockResolvedValue(true);
    const writer = new WebVaultWriter({
      entities: {
        hero: {
          id: "hero",
          connections: [{ target: "town", type: "located_in", strength: 1 }],
        },
      },
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      addConnection,
    });

    await expect(
      writer.appendConnection("hero", { target: "town", type: "located_in" }),
    ).resolves.toEqual({ created: false });
    await expect(
      writer.appendConnection("hero", { target: "town", type: "located_in" }),
    ).resolves.toEqual({ created: false });
    expect(addConnection).not.toHaveBeenCalled();
  });
});
