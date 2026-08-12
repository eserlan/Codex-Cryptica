import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import {
  vaultRecordCodec,
  WebShelfVault,
  type ShelfVaultDeps,
} from "./web-shelf-vault";

function deps(overrides: Partial<ShelfVaultDeps> = {}): ShelfVaultDeps {
  return {
    activeVaultId: () => "vault-a",
    vaultHandle: async () => null,
    entities: () => ({}),
    createEntity: async (_type, _title, initialData) =>
      initialData.id as string,
    deleteEntity: () => {},
    readStatSheetTemplate: () => null,
    readPresentationTemplate: () => null,
    saveStatSheetTemplate: async () => {},
    savePresentationTemplate: async () => {},
    deleteStatSheetTemplate: async () => {},
    deletePresentationTemplate: async () => {},
    ...overrides,
  };
}

describe("vaultRecordCodec", () => {
  it("round-trips an entity through the vault's own serialisation without loss", () => {
    // The Shelf defines no format of its own; it carries what the vault writes.
    const entity = {
      id: "goblin",
      title: "Goblin",
      type: "creature",
      labels: ["hostile"],
      aliases: ["Gobbo"],
      connections: [{ target: "king", type: "serves", strength: 1 }],
      statSheet: {
        templateId: "tpl",
        fields: [{ id: "hp", label: "HP", type: "number", value: 7 }],
      },
      soundBite: {
        transcript: "Grah!",
        audioFile: "audio/goblin.wav",
        voiceMode: "entity",
      },
      content: "A small, spiteful thing.",
    } as unknown as Entity;

    const record = vaultRecordCodec.stringify(
      { ...(entity as unknown as Record<string, unknown>) },
      "A small, spiteful thing.",
    );
    const { metadata, content } = vaultRecordCodec.parse(record);

    expect(content).toBe("A small, spiteful thing.");
    expect(metadata.statSheet).toMatchObject({
      fields: [{ id: "hp", value: 7 }],
    });
    expect(metadata.soundBite).toMatchObject({ audioFile: "audio/goblin.wav" });
    expect(metadata.connections).toEqual([
      { target: "king", type: "serves", strength: 1 },
    ]);
    expect(metadata.aliases).toEqual(["Gobbo"]);
  });
});

describe("WebShelfVault — reading", () => {
  it("returns null for an asset that has already gone, rather than throwing", async () => {
    const vault = new WebShelfVault(deps());
    await expect(vault.readAsset("images/missing.webp")).resolves.toBeNull();
  });

  it("lists entities with their aliases, the input to both title rules", async () => {
    const vault = new WebShelfVault(
      deps({
        entities: () => ({
          goblin: {
            id: "goblin",
            title: "Goblin",
            aliases: ["Gobbo"],
          } as Entity,
          orc: { id: "orc", title: "Orc" } as Entity,
        }),
      }),
    );

    await expect(vault.listEntities()).resolves.toEqual([
      { id: "goblin", title: "Goblin", aliases: ["Gobbo"] },
      { id: "orc", title: "Orc", aliases: [] },
    ]);
  });

  it("refuses to read an entity that is not in the open vault", async () => {
    const vault = new WebShelfVault(deps());
    await expect(vault.readEntityRecord("nope")).rejects.toThrow(/open vault/);
  });
});

describe("WebShelfVault — writing", () => {
  it("creates under the planned identifier", async () => {
    const createEntity = vi.fn(
      async (_t: string, _title: string, data: Partial<Entity>) =>
        String(data.id),
    );
    const vault = new WebShelfVault(deps({ createEntity }));

    await vault.createEntity({
      id: "goblin-2",
      record: vaultRecordCodec.stringify(
        { id: "goblin-2", title: "Goblin (2)", type: "creature" },
        "body",
      ),
    });

    expect(createEntity).toHaveBeenCalledWith(
      "creature",
      "Goblin (2)",
      expect.objectContaining({ id: "goblin-2", content: "body" }),
    );
  });

  it("fails loudly if the vault assigns a different id than was planned", async () => {
    // The journal lists the planned id. If the vault silently picked another,
    // rollback would delete the wrong thing — or nothing at all.
    const vault = new WebShelfVault(
      deps({ createEntity: async () => "something-else" }),
    );

    await expect(
      vault.createEntity({
        id: "goblin-2",
        record: vaultRecordCodec.stringify({ title: "Goblin (2)" }, ""),
      }),
    ).rejects.toThrow(/rollback/);
  });
});

describe("WebShelfVault — rollback idempotence (invariant J3)", () => {
  it("does not throw deleting an entity that was never created", async () => {
    const vault = new WebShelfVault(
      deps({
        deleteEntity: () => {
          throw new Error("no such entity");
        },
      }),
    );
    await expect(vault.deleteEntity("never-made")).resolves.toBeUndefined();
  });

  it("does not throw deleting assets when no vault handle is available", async () => {
    const vault = new WebShelfVault(deps());
    await expect(
      vault.deleteEntityAssets("never-made"),
    ).resolves.toBeUndefined();
  });

  it("does not throw deleting templates that were never written", async () => {
    const vault = new WebShelfVault(
      deps({
        deleteStatSheetTemplate: async () => {
          throw new Error("absent");
        },
        deletePresentationTemplate: async () => {
          throw new Error("absent");
        },
      }),
    );

    await expect(vault.deleteStatSheetTemplate("x")).resolves.toBeUndefined();
    await expect(
      vault.deletePresentationTemplate("y"),
    ).resolves.toBeUndefined();
  });
});

/** Just enough of an OPFS directory for writeOpfsFile to walk and write. */
function fakeVaultHandle(): FileSystemDirectoryHandle {
  const handle = {
    kind: "directory",
    getDirectoryHandle: async () => handle,
    getFileHandle: async () => ({
      createWritable: async () => ({
        write: async () => {},
        close: async () => {},
      }),
    }),
    removeEntry: async () => {},
  };
  return handle as unknown as FileSystemDirectoryHandle;
}

describe("WebShelfVault — asset paths are deterministic (FR-020)", () => {
  it("names a written asset from role alone, ignoring the incoming filename", async () => {
    // A filename-derived extension would leave rollback guessing: an asset
    // saved as `.jfif` would survive a delete pass looking for `.webp`.
    const vault = new WebShelfVault(
      deps({ vaultHandle: async () => fakeVaultHandle() }),
    );

    const { ref } = await vault.saveAsset({
      entityId: "goblin",
      role: "image",
      bytes: new Blob(["x"]),
      mimeType: "image/jpeg",
      originalName: "portrait.jfif",
    });

    expect(ref).toBe("images/goblin_image.webp");
  });

  it("uses the audio directory and extension for sound bites", async () => {
    const vault = new WebShelfVault(
      deps({ vaultHandle: async () => fakeVaultHandle() }),
    );

    const { ref } = await vault.saveAsset({
      entityId: "goblin",
      role: "soundBite",
      bytes: new Blob(["x"]),
      mimeType: "audio/wav",
      originalName: "clip.ogg",
    });

    expect(ref).toBe("audio/goblin_soundBite.wav");
  });
});
