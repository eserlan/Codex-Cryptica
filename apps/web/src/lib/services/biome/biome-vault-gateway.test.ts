import { describe, expect, it, vi } from "vitest";
import {
  createProfileFromReference,
  getBiome,
  setOwnField,
  type BiomeProfile,
} from "biome-engine";
import {
  createWebBiomeVaultGateway,
  type BiomeVaultLike,
} from "./biome-vault-gateway";

type Entity = Record<string, unknown> & { id: string; kind?: string };

function fakeVault(seed: Entity[] = []) {
  const entities: Record<string, Entity> = Object.fromEntries(
    seed.map((e) => [e.id, e]),
  );
  let n = 1;
  const created: {
    type: string;
    title: string;
    data: Record<string, unknown>;
  }[] = [];
  const vault: BiomeVaultLike & { fail: boolean } = {
    fail: false,
    entities,
    createEntity: vi.fn(async (type, title, data) => {
      if (vault.fail) throw new Error("nope");
      const id = `note-${n++}`;
      entities[id] = { id, type, title, ...data } as Entity;
      created.push({ type, title, data: data as Record<string, unknown> });
      return id;
    }),
    updateEntity: vi.fn(async (id, updates) => {
      if (vault.fail || !entities[id]) return false;
      entities[id] = { ...entities[id], ...updates } as Entity;
      return true;
    }),
    deleteEntity: vi.fn(async (id) => {
      if (vault.fail) throw new Error("nope");
      delete entities[id];
    }),
    saveImageToVault: vi.fn(async (file: File, id: string) => {
      if (vault.fail) throw new Error("nope");
      return {
        image: `images/${id}-${file.name}`,
        thumbnail: `thumbs/${id}.webp`,
      };
    }),
    resolveImageUrl: vi.fn(async (path: string) => `blob:${path}`),
  };
  return { vault, entities, created };
}

const tundra = getBiome("tundra")!;
const profile = (): BiomeProfile =>
  setOwnField(
    createProfileFromReference(tundra, 1),
    "vegetation",
    "Glowing moss",
  );

describe("web biome vault gateway", () => {
  it("creates a Note of kind biome with labels, the structured field and Markdown content", async () => {
    const { vault, entities, created } = fakeVault();
    const gateway = createWebBiomeVaultGateway(vault);
    const id = await gateway.create(
      "Ashen Flats",
      profile(),
      "# Ashen Flats\n",
    );
    expect(created[0].type).toBe("note");
    const entity = entities[id];
    expect(entity.kind).toBe("biome");
    expect(entity.labels).toEqual(["biome", "Tundra"]);
    expect(entity.content).toBe("# Ashen Flats\n");
    expect((entity.biome as BiomeProfile).own.vegetation).toBe("Glowing moss");
  });

  it("does not set visibility or publish anything on creation", async () => {
    const { vault, created } = fakeVault();
    await createWebBiomeVaultGateway(vault).create("X", profile(), "# X\n");
    expect(created[0].data.visibility).toBeUndefined();
    expect(created[0].data).not.toHaveProperty("status", "active");
  });

  it("labels a blank-start profile with only 'biome'", async () => {
    const { vault, entities } = fakeVault();
    const blank = { ...profile(), reference: null };
    const id = await createWebBiomeVaultGateway(vault).create(
      "Blank",
      blank,
      "# B\n",
    );
    expect(entities[id].labels).toEqual(["biome"]);
  });

  it("updates title, structured field and content, keeping the user's other labels", async () => {
    const { vault, entities } = fakeVault();
    const gateway = createWebBiomeVaultGateway(vault);
    const id = await gateway.create("Ashen Flats", profile(), "# old\n");
    entities[id].labels = ["biome", "Tundra", "my-label"];
    await gateway.update(id, "Ashen Plains", profile(), "# new\n");
    expect(entities[id].title).toBe("Ashen Plains");
    expect(entities[id].content).toBe("# new\n");
    expect(entities[id].labels).toEqual(["biome", "Tundra", "my-label"]);
  });

  it("throws when an update cannot be written so the store can keep the draft", async () => {
    const { vault } = fakeVault();
    const gateway = createWebBiomeVaultGateway(vault);
    const id = await gateway.create("A", profile(), "# A\n");
    vault.fail = true;
    await expect(gateway.update(id, "A", profile(), "# A\n")).rejects.toThrow();
    await expect(gateway.create("B", profile(), "# B\n")).rejects.toThrow();
  });

  it("lists only biome entities, newest information first, with the reference name", async () => {
    const { vault } = fakeVault([
      { id: "plain", title: "Not a biome", kind: "report" },
      { id: "other", title: "Other note" },
    ]);
    const gateway = createWebBiomeVaultGateway(vault);
    await gateway.create("Ashen Flats", profile(), "# A\n");
    const listed = await gateway.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      title: "Ashen Flats",
      referenceName: "Tundra",
    });
  });

  it("tells same-named profiles apart by their ids and keeps both", async () => {
    const { vault } = fakeVault();
    const gateway = createWebBiomeVaultGateway(vault);
    const a = await gateway.create("Twin", profile(), "# 1\n");
    const b = await gateway.create("Twin", profile(), "# 2\n");
    expect(a).not.toBe(b);
    expect(await gateway.list()).toHaveLength(2);
  });

  it("loads a saved profile and returns null for a missing or unreadable one", async () => {
    const { vault, entities } = fakeVault();
    const gateway = createWebBiomeVaultGateway(vault);
    const id = await gateway.create("Ashen", profile(), "# A\n");
    const loaded = await gateway.load(id);
    expect(loaded?.title).toBe("Ashen");
    expect(loaded?.profile.own.vegetation).toBe("Glowing moss");

    expect(await gateway.load("nope")).toBeNull();
    entities[id].biome = { version: 1 };
    expect(await gateway.load(id)).toBeNull();
    entities.other = { id: "other", title: "n", kind: "note" } as Entity;
    expect(await gateway.load("other")).toBeNull();
  });

  it("skips a biome entity whose structured field cannot be read when listing", async () => {
    const { vault } = fakeVault([
      { id: "bad", title: "Broken", kind: "biome", biome: { version: 9 } },
    ]);
    const listed = await createWebBiomeVaultGateway(vault).list();
    expect(listed).toEqual([]);
  });

  it("removes an entity and surfaces a write failure", async () => {
    const { vault, entities } = fakeVault();
    const gateway = createWebBiomeVaultGateway(vault);
    const id = await gateway.create("A", profile(), "# A\n");
    await gateway.remove(id);
    expect(entities[id]).toBeUndefined();
    const id2 = await gateway.create("B", profile(), "# B\n");
    vault.fail = true;
    await expect(gateway.remove(id2)).rejects.toThrow();
  });

  describe("pictures", () => {
    const file = new File(["x"], "flats.png", { type: "image/png" });

    it("attaches a picture through the vault's image path and resolves it", async () => {
      const { vault, entities } = fakeVault();
      const gateway = createWebBiomeVaultGateway(vault);
      const id = await gateway.create("A", profile(), "# A\n");
      expect(await gateway.imageUrl(id)).toBe("");
      await gateway.attachImage(id, file);
      expect(entities[id].image).toBe(`images/${id}-flats.png`);
      expect(await gateway.imageUrl(id)).toBe(`blob:images/${id}-flats.png`);
    });

    it("removes the picture", async () => {
      const { vault, entities } = fakeVault();
      const gateway = createWebBiomeVaultGateway(vault);
      const id = await gateway.create("A", profile(), "# A\n");
      await gateway.attachImage(id, file);
      await gateway.removeImage(id);
      expect(entities[id].image).toBeUndefined();
      expect(await gateway.imageUrl(id)).toBe("");
    });

    it("surfaces a failure to save the picture", async () => {
      const { vault } = fakeVault();
      const gateway = createWebBiomeVaultGateway(vault);
      const id = await gateway.create("A", profile(), "# A\n");
      vault.fail = true;
      await expect(gateway.attachImage(id, file)).rejects.toThrow();
    });

    it("fails when the entity cannot be updated", async () => {
      const { vault } = fakeVault();
      const gateway = createWebBiomeVaultGateway(vault);
      await expect(gateway.attachImage("missing", file)).rejects.toThrow();
      await expect(gateway.removeImage("missing")).rejects.toThrow();
    });
  });
});
