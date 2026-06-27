import { describe, expect, it, vi } from "vitest";
import { ImportEngine } from "@codex/importer";
import { WebVaultWriter } from "./web-vault-writer";

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

  it("maps tags to both tags and labels when creating entities", async () => {
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
      tags: ["important", "npc"],
      discoverySource: "scabard:id:1",
    });

    expect(result).toEqual({ id: "hero" });
    expect(createEntity).toHaveBeenCalledWith("character", "Hero", {
      content: "Lore",
      lore: undefined,
      tags: ["important", "npc"],
      labels: ["important", "npc"],
      metadata: undefined,
      discoverySource: "scabard:id:1",
      parent: undefined,
      connections: undefined,
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
        tags: ["important"],
        discoverySource: "scabard:id:1",
      },
      {
        type: "location",
        title: "Moon Harbor",
        content: "Harbor note",
        tags: ["port"],
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
          tags: ["important"],
          labels: ["important"],
          metadata: undefined,
          discoverySource: "scabard:id:1",
          parent: undefined,
          connections: undefined,
        },
      },
      {
        type: "location",
        title: "Moon Harbor",
        initialData: {
          content: "Harbor note",
          lore: undefined,
          tags: ["port"],
          labels: ["port"],
          metadata: undefined,
          discoverySource: "scabard:id:2",
          parent: undefined,
          connections: undefined,
        },
      },
    ]);
    expect(result).toEqual([{ id: "hero" }, { id: "harbor" }]);
  });

  it("maps patch tags to labels on update", async () => {
    const updateEntity = vi.fn().mockResolvedValue(true);
    const writer = new WebVaultWriter({
      entities: {},
      createEntity: vi.fn(),
      updateEntity,
      addConnection: vi.fn(),
    });

    await writer.updateEntity("hero", {
      title: "Updated Hero",
      tags: ["story"],
    });

    expect(updateEntity).toHaveBeenCalledWith("hero", {
      type: undefined,
      title: "Updated Hero",
      content: undefined,
      lore: undefined,
      tags: ["story"],
      labels: ["story"],
      metadata: undefined,
      parent: undefined,
      connections: undefined,
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

  it("appends one-directional connections through the vault API", async () => {
    const addConnection = vi.fn().mockResolvedValue(true);
    const writer = new WebVaultWriter({
      entities: {},
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

  it("reports asset persistence as unsupported", async () => {
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
      }),
    ).rejects.toThrow("Generic CC asset persistence is not supported");
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
          tags: ["story"],
        },
        {
          sourceId: "town-1",
          title: "Moon Harbor",
          content: "Harbor note",
          tags: ["port"],
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
});
