import { beforeEach, describe, expect, it } from "vitest";
import type { PresentationTemplate, StatSheetTemplate } from "schema";
import { shelveEntities } from "./shelve";
import {
  blobOf,
  FakeClock,
  FakeVault,
  InMemoryShelfStore,
  JsonRecordCodec,
  SeqIdFactory,
} from "./test-helpers";

const codec = new JsonRecordCodec();

const schemaTemplate = {
  id: "tpl-monster",
  name: "Monster",
  fields: [{ id: "hp", label: "HP", type: "number" }],
} as StatSheetTemplate;

const presentationTemplate = {
  id: "pres-monster",
  vaultId: "vault-a",
  schemaTemplateId: "tpl-monster",
  name: "Monster Sheet",
  description: null,
  source: "# {{name}}",
  formatVersion: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as PresentationTemplate;

/** A fully authored entity: every asset role, a stat sheet, and both templates. */
function fullRecord(): string {
  return codec.stringify(
    {
      id: "goblin",
      title: "Goblin",
      type: "creature",
      labels: ["hostile"],
      aliases: ["Gobbo"],
      lore: "Lurks in tunnels.",
      status: "active",
      kind: "minion",
      visibility: "visible",
      image: "images/goblin.webp",
      thumbnail: "images/goblin_thumb.webp",
      soundBite: {
        transcript: "Grah!",
        audioFile: "audio/goblin_soundbite.wav",
        voiceMode: "entity",
      },
      imageArtDirection: { artDirectionVersion: 2, prompt: "a goblin" },
      languageProfile: { some: "profile" },
      date: { precision: "year", year: 300, calendarRevision: 1 },
      connections: [{ target: "goblin-king", type: "serves" }],
      statSheet: {
        templateId: "tpl-monster",
        presentationTemplateId: "pres-monster",
        fields: [{ id: "hp", label: "HP", type: "number", value: 7 }],
      },
    },
    "A small, spiteful thing.",
  );
}

function makeVault(): FakeVault {
  return new FakeVault({
    entities: [{ id: "goblin", title: "Goblin", record: fullRecord() }],
    assets: {
      "images/goblin.webp": {
        bytes: blobOf("image-bytes"),
        mimeType: "image/webp",
        originalName: "goblin.webp",
      },
      "images/goblin_thumb.webp": {
        bytes: blobOf("thumb"),
        mimeType: "image/webp",
        originalName: "goblin_thumb.webp",
      },
      "audio/goblin_soundbite.wav": {
        bytes: blobOf("audio-bytes"),
        mimeType: "audio/wav",
        originalName: "goblin_soundbite.wav",
      },
    },
    schemaTemplates: [schemaTemplate],
    presentationTemplates: [presentationTemplate],
  });
}

function deps(store: InMemoryShelfStore, vault: FakeVault) {
  return {
    store,
    reader: vault,
    codec,
    clock: new FakeClock(5_000),
    ids: new SeqIdFactory("entry"),
  };
}

describe("shelveEntities", () => {
  let store: InMemoryShelfStore;
  let vault: FakeVault;

  beforeEach(() => {
    store = new InMemoryShelfStore();
    vault = makeVault();
  });

  it("collects all three asset roles, sound bite audio included (FR-005)", async () => {
    // Sound bites are the asset role easily missed behind image and thumbnail:
    // the entity arrives looking correct and fails only when someone presses play.
    await shelveEntities(deps(store, vault), {
      vaultId: "vault-a",
      vaultName: "Vault A",
      entityIds: ["goblin"],
    });

    const entry = [...store.entries.values()][0];
    expect(entry.assets.map((a) => a.role).sort()).toEqual([
      "image",
      "soundBite",
      "thumbnail",
    ]);
  });

  it("carries the entity record verbatim, dropping no field (FR-004)", async () => {
    await shelveEntities(deps(store, vault), {
      vaultId: "vault-a",
      vaultName: "Vault A",
      entityIds: ["goblin"],
    });

    const entry = [...store.entries.values()][0];
    expect(entry.entityRecord).toBe(fullRecord());

    const { metadata } = codec.parse(entry.entityRecord);
    for (const field of [
      "statSheet",
      "connections",
      "soundBite",
      "date",
      "status",
      "kind",
      "visibility",
      "languageProfile",
      "imageArtDirection",
      "aliases",
      "labels",
      "lore",
    ]) {
      expect(metadata, `${field} must survive shelving`).toHaveProperty(field);
    }
  });

  it("attaches both templates the stat sheet depends on, vaultId stripped (FR-006, I3)", async () => {
    await shelveEntities(deps(store, vault), {
      vaultId: "vault-a",
      vaultName: "Vault A",
      entityIds: ["goblin"],
    });

    const entry = [...store.entries.values()][0];
    expect(entry.statSheetTemplate?.id).toBe("tpl-monster");
    expect(entry.presentationTemplate?.id).toBe("pres-monster");
    expect(entry.presentationTemplate?.vaultId).toBeNull();
  });

  it("shelves without an asset whose file has already gone from its own vault", async () => {
    vault.assets.delete("images/goblin.webp");

    await shelveEntities(deps(store, vault), {
      vaultId: "vault-a",
      vaultName: "Vault A",
      entityIds: ["goblin"],
    });

    const entry = [...store.entries.values()][0];
    expect(entry.assets.map((a) => a.role)).not.toContain("image");
    expect(entry.assets).toHaveLength(2);
  });

  it("records a groupId on every entry, a lone entity included (FR-008)", async () => {
    const group = await shelveEntities(deps(store, vault), {
      vaultId: "vault-a",
      vaultName: "Vault A",
      entityIds: ["goblin"],
    });

    const entry = [...store.entries.values()][0];
    expect(entry.groupId).toBe(group.id);
    expect(group.entries).toHaveLength(1);
  });

  it("captures the source vault name so it survives that vault being deleted (FR-007)", async () => {
    await shelveEntities(deps(store, vault), {
      vaultId: "vault-a",
      vaultName: "Vault A",
      entityIds: ["goblin"],
    });

    const entry = [...store.entries.values()][0];
    expect(entry.sourceVaultName).toBe("Vault A");
    expect(entry.shelvedAt).toBe(5_000);
  });

  it("replaces the earlier snapshot when the same entity is shelved again (FR-009, I2)", async () => {
    const input = {
      vaultId: "vault-a",
      vaultName: "Vault A",
      entityIds: ["goblin"],
    };
    await shelveEntities(deps(store, vault), input);
    await shelveEntities(deps(store, vault), input);

    expect(store.entries.size).toBe(1);
  });

  it("leaves the source vault completely untouched (FR-010)", async () => {
    const before = vault.snapshot();

    await shelveEntities(deps(store, vault), {
      vaultId: "vault-a",
      vaultName: "Vault A",
      entityIds: ["goblin"],
    });

    expect(vault.snapshot()).toBe(before);
    expect(vault.writes).toEqual([]);
  });

  it("leaves no partial entries when storage runs out part-way through (SC-007)", async () => {
    vault.entities.set("orc", {
      id: "orc",
      title: "Orc",
      aliases: [],
      record: codec.stringify(
        { id: "orc", title: "Orc", type: "creature" },
        "",
      ),
    });

    let calls = 0;
    const failingStore = new InMemoryShelfStore();
    const originalPut = failingStore.putEntry.bind(failingStore);
    failingStore.putEntry = async (entry) => {
      calls += 1;
      if (calls === 2) throw new Error("QuotaExceededError");
      return originalPut(entry);
    };

    await expect(
      shelveEntities(deps(failingStore, vault), {
        vaultId: "vault-a",
        vaultName: "Vault A",
        entityIds: ["goblin", "orc"],
      }),
    ).rejects.toThrow(/not enough storage/i);

    expect(failingStore.entries.size).toBe(0);
  });

  it("names a non-quota failure instead of blaming storage", async () => {
    // Reporting every failure as "there may not be enough storage" sent people
    // to clear space over faults that had nothing to do with space, and buried
    // the real cause where nobody would look for it.
    const failingStore = new InMemoryShelfStore();
    failingStore.failNextPut = Object.assign(
      new Error("Failed to execute 'put': An object could not be cloned."),
      { name: "DataCloneError" },
    );

    await expect(
      shelveEntities(deps(failingStore, vault), {
        vaultId: "vault-a",
        vaultName: "Vault A",
        entityIds: ["goblin"],
      }),
    ).rejects.toThrow(/could not be cloned/i);

    await expect(
      shelveEntities(deps(new InMemoryShelfStore(), vault), {
        vaultId: "vault-a",
        vaultName: "Vault A",
        entityIds: ["goblin"],
      }),
    ).resolves.toBeTruthy();
  });

  it("still names quota when quota really is the problem", async () => {
    const failingStore = new InMemoryShelfStore();
    failingStore.failNextPut = Object.assign(new Error("out of room"), {
      name: "QuotaExceededError",
    });

    await expect(
      shelveEntities(deps(failingStore, vault), {
        vaultId: "vault-a",
        vaultName: "Vault A",
        entityIds: ["goblin"],
      }),
    ).rejects.toThrow(/not enough storage/i);
  });

  it("reports progress so a long shelve does not look frozen (SC-009)", async () => {
    const seen: number[] = [];
    await shelveEntities(
      deps(store, vault),
      { vaultId: "vault-a", vaultName: "Vault A", entityIds: ["goblin"] },
      (report: { completed: number }) => seen.push(report.completed),
    );

    expect(seen.length).toBeGreaterThan(0);
  });
});
