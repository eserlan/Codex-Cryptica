import { beforeEach, describe, expect, it } from "vitest";
import type { PresentationTemplate, StatSheetTemplate } from "schema";
import {
  chooseTemplate,
  executeImport,
  planImport,
  recoverCrashedImports,
} from "./import";
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

function goblinRecord(): string {
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
      soundBite: {
        transcript: "Grah!",
        audioFile: "audio/goblin.wav",
        voiceMode: "entity",
      },
      imageArtDirection: { artDirectionVersion: 2, prompt: "a goblin" },
      languageProfile: { some: "profile" },
      date: { precision: "year", year: 300, calendarRevision: 1 },
      connections: [{ target: "goblin-king", type: "serves" }],
      parent: "goblin-king",
      statSheet: {
        templateId: "tpl-monster",
        presentationTemplateId: "pres-monster",
        fields: [{ id: "hp", label: "HP", type: "number", value: 7 }],
      },
    },
    "A small, spiteful thing.",
  );
}

function kingRecord(): string {
  return codec.stringify(
    {
      id: "goblin-king",
      title: "Goblin King",
      type: "character",
      connections: [{ target: "goblin", type: "commands" }],
    },
    "Wears a tin crown.",
  );
}

function sourceVault(): FakeVault {
  return new FakeVault({
    entities: [
      {
        id: "goblin",
        title: "Goblin",
        aliases: ["Gobbo"],
        record: goblinRecord(),
      },
      { id: "goblin-king", title: "Goblin King", record: kingRecord() },
    ],
    assets: {
      "images/goblin.webp": {
        bytes: blobOf("image-bytes"),
        mimeType: "image/webp",
        originalName: "goblin.webp",
      },
      "audio/goblin.wav": {
        bytes: blobOf("audio-bytes"),
        mimeType: "audio/wav",
        originalName: "goblin.wav",
      },
    },
    schemaTemplates: [schemaTemplate],
    presentationTemplates: [presentationTemplate],
  });
}

async function shelfWith(entityIds: string[], store: InMemoryShelfStore) {
  const source = sourceVault();
  await shelveEntities(
    {
      store,
      reader: source,
      codec,
      clock: new FakeClock(5_000),
      ids: new SeqIdFactory("entry"),
    },
    { vaultId: "vault-a", vaultName: "Vault A", entityIds },
  );
  return [...store.entries.values()];
}

function importDeps(store: InMemoryShelfStore, target: FakeVault) {
  return {
    store,
    reader: target,
    writer: target,
    codec,
    clock: new FakeClock(9_000),
    ids: new SeqIdFactory("imp"),
  };
}

describe("import — the round trip", () => {
  let store: InMemoryShelfStore;
  let target: FakeVault;

  beforeEach(async () => {
    store = new InMemoryShelfStore();
    target = new FakeVault();
  });

  it("carries every authored field into the destination (FR-004, SC-002)", async () => {
    const entries = await shelfWith(["goblin"], store);
    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    await executeImport(deps, plan);

    const created = [...target.entities.values()].find(
      (e) => e.title === "Goblin",
    );
    expect(created).toBeDefined();
    const { metadata, content } = codec.parse(created!.record);

    expect(content).toBe("A small, spiteful thing.");
    expect(metadata.statSheet).toMatchObject({
      fields: [{ id: "hp", label: "HP", type: "number", value: 7 }],
    });
    expect(metadata.labels).toEqual(["hostile"]);
    expect(metadata.aliases).toEqual(["Gobbo"]);
    expect(metadata.lore).toBe("Lurks in tunnels.");
    expect(metadata.status).toBe("active");
    expect(metadata.kind).toBe("minion");
    expect(metadata.visibility).toBe("visible");
    expect(metadata.languageProfile).toEqual({ some: "profile" });
    expect(metadata.imageArtDirection).toMatchObject({
      artDirectionVersion: 2,
    });
    expect(metadata.date).toMatchObject({ year: 300 });
  });

  it("writes the entry's assets into the destination and points the record at them (FR-014)", async () => {
    const entries = await shelfWith(["goblin"], store);
    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    await executeImport(deps, plan);

    const created = [...target.entities.values()][0];
    const { metadata } = codec.parse(created.record);

    expect(target.assets.has(metadata.image as string)).toBe(true);
    const soundBite = metadata.soundBite as { audioFile: string };
    expect(target.assets.has(soundBite.audioFile)).toBe(true);
    // The sound bite is the asset role that gets forgotten; the entity looks
    // correct until someone presses play.
    expect(await target.assets.get(soundBite.audioFile)!.bytes.text()).toBe(
      "audio-bytes",
    );
  });

  it("brings both templates along so the sheet renders as it did (FR-006, FR-015)", async () => {
    const entries = await shelfWith(["goblin"], store);
    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    await executeImport(deps, plan);

    expect(target.schemaTemplates.has("tpl-monster")).toBe(true);
    expect(target.presentationTemplates.get("pres-monster")?.vaultId).toBe(
      "vault-b",
    );
  });

  it("leaves the entry on the shelf so it can be imported again (FR-021)", async () => {
    const entries = await shelfWith(["goblin"], store);
    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    await executeImport(deps, plan);

    expect(store.entries.size).toBe(1);
  });

  it("imports completely when the source vault has since been deleted (SC-006)", async () => {
    // Nothing reaches back to the source: the entry carries its own copies.
    const entries = await shelfWith(["goblin"], store);
    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    const outcome = await executeImport(deps, plan);

    expect(outcome.created).toHaveLength(1);
    expect(target.schemaTemplates.size).toBe(1);
    expect(target.assets.size).toBe(2);
  });
});

describe("import — identity and titles", () => {
  it("never overwrites, merges into, or removes an existing entity (FR-013, SC-004)", async () => {
    // This is what makes rollback safe rather than destructive (invariant J2),
    // so it is verified directly rather than inferred from the design.
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);

    const target = new FakeVault({
      entities: [{ id: "goblin", title: "Goblin", record: "PRE-EXISTING" }],
    });
    const before = target.snapshot();

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    await executeImport(deps, plan);

    expect(target.entities.get("goblin")!.record).toBe("PRE-EXISTING");
    expect(target.entities.size).toBe(2);
    expect(before).not.toBe(target.snapshot());
  });

  it("suffixes a colliding title and reports the rename (FR-013a, FR-019)", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = new FakeVault({
      entities: [{ id: "existing", title: "Goblin", record: "x" }],
    });

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    const outcome = await executeImport(deps, plan);

    expect(outcome.renamed).toEqual([{ from: "Goblin", to: "Goblin (2)" }]);
  });

  it("leaves the title untouched when nothing collides (US1-6)", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = new FakeVault();

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    const outcome = await executeImport(deps, plan);

    expect(outcome.renamed).toEqual([]);
    expect(outcome.created[0].title).toBe("Goblin");
  });

  it("produces three independent entities when one entry is imported three times", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = new FakeVault();
    const deps = importDeps(store, target);

    for (let i = 0; i < 3; i += 1) {
      const plan = await planImport(deps, {
        entryIds: entries.map((e) => e.id),
        targetVaultId: "vault-b",
      });
      await executeImport(deps, plan);
    }

    expect(target.entities.size).toBe(3);
  });
});

describe("import — connections and parents", () => {
  it("recreates every connection among entities imported together (US2-2, SC-003)", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin", "goblin-king"], store);
    const target = new FakeVault();

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    await executeImport(deps, plan);

    const goblin = [...target.entities.values()].find(
      (e) => e.title === "Goblin",
    )!;
    const king = [...target.entities.values()].find(
      (e) => e.title === "Goblin King",
    )!;

    const goblinMeta = codec.parse(goblin.record).metadata;
    const kingMeta = codec.parse(king.record).metadata;

    expect(goblinMeta.connections).toEqual([
      { target: king.id, type: "serves" },
    ]);
    expect(kingMeta.connections).toEqual([
      { target: goblin.id, type: "commands" },
    ]);
    expect(goblinMeta.parent).toBe(king.id);
  });

  it("reconnects to a destination entity matched by title (US2-3)", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = new FakeVault({
      entities: [{ id: "the-king", title: "Goblin King", record: "x" }],
    });

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    const outcome = await executeImport(deps, plan);

    const goblin = [...target.entities.values()].find(
      (e) => e.title === "Goblin",
    )!;
    expect(codec.parse(goblin.record).metadata.connections).toEqual([
      { target: "the-king", type: "serves" },
    ]);
    expect(outcome.droppedConnections).toEqual([]);
  });

  it("drops an unresolvable connection and reports it, without failing (FR-018, SC-005)", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = new FakeVault();

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    const outcome = await executeImport(deps, plan);

    expect(outcome.created).toHaveLength(1);
    expect(outcome.droppedConnections).toHaveLength(1);
    expect(outcome.droppedConnections[0].reason).toBe("not-found");
    expect(outcome.droppedParents[0].reason).toBe("not-found");

    const goblin = [...target.entities.values()][0];
    const metadata = codec.parse(goblin.record).metadata;
    expect(metadata.connections).toEqual([]);
    expect(metadata.parent).toBeUndefined();
  });

  it("declines to guess between two same-named candidates (FR-018)", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = new FakeVault({
      entities: [
        { id: "king-a", title: "Goblin King", record: "x" },
        { id: "king-b", title: "goblin king", record: "y" },
      ],
    });

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    const outcome = await executeImport(deps, plan);

    expect(outcome.droppedConnections[0].reason).toBe("ambiguous");
  });
});

describe("import — template conflicts", () => {
  function conflictingTarget(): FakeVault {
    return new FakeVault({
      schemaTemplates: [
        {
          ...schemaTemplate,
          fields: [{ id: "ac", label: "AC", type: "number" }],
        } as StatSheetTemplate,
      ],
    });
  }

  it("raises one decision per template however many entities need it (FR-016a)", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin", "goblin-king"], store);
    const target = conflictingTarget();

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });

    const unresolved = plan.templateDecisions.filter(
      (d: { unresolved: boolean }) => d.unresolved,
    );
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].templateId).toBe("tpl-monster");
  });

  it("refuses to write while a conflict is unresolved, leaving the vault untouched", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = conflictingTarget();
    const before = target.snapshot();

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });

    await expect(executeImport(deps, plan)).rejects.toThrow(/unresolved/i);
    expect(target.snapshot()).toBe(before);
  });

  it("keeps the target vault's template when the author chooses so", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = conflictingTarget();

    const deps = importDeps(store, target);
    let plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    plan = chooseTemplate(plan, "tpl-monster", "keep-existing");
    await executeImport(deps, plan);

    expect(target.schemaTemplates.get("tpl-monster")!.fields[0].id).toBe("ac");
  });

  it("brings the incoming template in under a fresh id rather than overwriting the author's", async () => {
    // Overwriting would make rollback destructive: it would delete a template
    // the import did not create (invariant J2). A second template is the only
    // version of "bring mine in" that keeps deletion safe.
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = conflictingTarget();

    const deps = importDeps(store, target);
    let plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    plan = chooseTemplate(plan, "tpl-monster", "bring-in");
    await executeImport(deps, plan);

    expect(target.schemaTemplates.get("tpl-monster")!.fields[0].id).toBe("ac");
    expect(target.schemaTemplates.size).toBe(2);

    const goblin = [...target.entities.values()][0];
    const sheet = codec.parse(goblin.record).metadata.statSheet as {
      templateId: string;
    };
    expect(sheet.templateId).not.toBe("tpl-monster");
    expect(target.schemaTemplates.has(sheet.templateId)).toBe(true);
  });

  it("reuses an identical template already present, without duplicating it (FR-015)", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = new FakeVault({ schemaTemplates: [schemaTemplate] });

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    const outcome = await executeImport(deps, plan);

    expect(target.schemaTemplates.size).toBe(1);
    expect(outcome.templatesReused).toContain("tpl-monster");
  });
});

describe("import — atomicity", () => {
  const failurePoints = ["createEntity", "saveAsset", "saveStatSheetTemplate"];

  for (const failAt of failurePoints) {
    it(`leaves the vault untouched when ${failAt} fails (FR-020, SC-007)`, async () => {
      const store = new InMemoryShelfStore();
      const entries = await shelfWith(["goblin"], store);
      const target = new FakeVault();
      const before = target.snapshot();
      target.failOn = failAt;

      const deps = importDeps(store, target);
      const plan = await planImport(deps, {
        entryIds: entries.map((e) => e.id),
        targetVaultId: "vault-b",
      });

      await expect(executeImport(deps, plan)).rejects.toThrow();

      expect(target.snapshot()).toBe(before);
      expect(store.journals.size).toBe(0);
    });
  }

  it("keeps the entry on the shelf after a failed import", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = new FakeVault();
    target.failOn = "createEntity";

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    await expect(executeImport(deps, plan)).rejects.toThrow();

    expect(store.entries.size).toBe(1);
  });

  it("never rolls back a template it reused rather than created", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = new FakeVault({ schemaTemplates: [schemaTemplate] });
    target.failOn = "createEntity";

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    await expect(executeImport(deps, plan)).rejects.toThrow();

    expect(target.schemaTemplates.has("tpl-monster")).toBe(true);
  });

  it("deletes the journal on success", async () => {
    const store = new InMemoryShelfStore();
    const entries = await shelfWith(["goblin"], store);
    const target = new FakeVault();

    const deps = importDeps(store, target);
    const plan = await planImport(deps, {
      entryIds: entries.map((e) => e.id),
      targetVaultId: "vault-b",
    });
    await executeImport(deps, plan);

    expect(store.journals.size).toBe(0);
  });
});

describe("recoverCrashedImports", () => {
  it("replays a journal left behind by a crashed import as deletes", async () => {
    const store = new InMemoryShelfStore();
    const target = new FakeVault({
      entities: [{ id: "half-written", title: "Half Written", record: "x" }],
      schemaTemplates: [schemaTemplate],
    });

    await store.writeJournal({
      importId: "imp-1",
      vaultId: "vault-b",
      startedAt: 1,
      entityIds: ["half-written"],
      schemaTemplateIds: ["tpl-monster"],
      presentationTemplateIds: [],
    });

    await recoverCrashedImports({ store }, () => target);

    expect(target.entities.has("half-written")).toBe(false);
    expect(target.schemaTemplates.has("tpl-monster")).toBe(false);
    expect(store.journals.size).toBe(0);
  });

  it("is idempotent against artifacts the failure prevented from existing (J3)", async () => {
    const store = new InMemoryShelfStore();
    const target = new FakeVault();

    await store.writeJournal({
      importId: "imp-1",
      vaultId: "vault-b",
      startedAt: 1,
      entityIds: ["never-created"],
      schemaTemplateIds: ["never-written"],
      presentationTemplateIds: ["also-never"],
    });

    await expect(
      recoverCrashedImports({ store }, () => target),
    ).resolves.toBeUndefined();
    expect(store.journals.size).toBe(0);
  });
});
