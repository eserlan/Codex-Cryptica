import { describe, it, expect } from "vitest";
import { CifManifestSchema } from "./package";
import {
  normalizeCifPackage,
  cifSourceRefBuilder,
  CIF_MAPPING_RULES,
} from "./normalize";
import { ImportEngine } from "../cc/engine";
import { setMatchDecision, setItemDecision } from "../cc/session";
import type {
  VaultWriter,
  NewEntityInput,
  EntityPatch,
  ExistingEntityFields,
  Connection,
} from "../cc/ports";

/**
 * A minimal, persistent (across two import passes) in-memory writer,
 * keyed by `discoverySource` (== sourceRef, exactly as the real engine sets
 * it) — never by title, mirroring `titleFallback: false` (FR-014) and
 * supporting `getEntityFields`/duplicate-connection detection so this test
 * exercises the real FR-008/FR-013/FR-015/FR-016 semantics end-to-end.
 */
class ReimportFakeWriter implements VaultWriter {
  private entities = new Map<string, NewEntityInput & { id: string }>();
  private connections = new Map<string, Connection[]>();
  private nextId = 1;
  mutationCount = 0;

  async findBySourceRef(sourceRef: string): Promise<{ id: string } | null> {
    for (const entity of this.entities.values()) {
      if (entity.discoverySource === sourceRef) return { id: entity.id };
    }
    return null;
  }

  async createEntity(entity: NewEntityInput): Promise<{ id: string }> {
    const id = `entity-${this.nextId++}`;
    this.entities.set(id, { ...entity, id });
    this.connections.set(id, []);
    this.mutationCount++;
    return { id };
  }

  async updateEntity(id: string, patch: EntityPatch): Promise<void> {
    const existing = this.entities.get(id);
    if (!existing) throw new Error(`Entity ${id} not found`);
    const updated = { ...existing };
    for (const key of Object.keys(patch) as Array<keyof EntityPatch>) {
      if (patch[key] !== undefined) {
        (updated as Record<string, unknown>)[key] = patch[key];
      }
    }
    this.entities.set(id, updated);
    this.mutationCount++;
  }

  async appendConnection(
    id: string,
    connection: Connection,
  ): Promise<{ created: boolean }> {
    const existing = this.connections.get(id) ?? [];
    const alreadyExists = existing.some(
      (c) =>
        c.target === connection.target &&
        c.type === connection.type &&
        c.label === connection.label,
    );
    if (alreadyExists) return { created: false };
    this.connections.set(id, [...existing, connection]);
    this.mutationCount++;
    return { created: true };
  }

  async getEntityFields(id: string): Promise<ExistingEntityFields | null> {
    const entity = this.entities.get(id);
    if (!entity) return null;
    return {
      title: entity.title,
      content: entity.content,
      lore: entity.lore,
      labels: entity.labels,
      aliases: entity.aliases,
      type: entity.type,
      parent: entity.parent,
      startDate: entity.startDate,
      endDate: entity.endDate,
    };
  }

  async saveAsset(): Promise<{ ref: string }> {
    throw new Error("not used in this test");
  }

  get(id: string) {
    return this.entities.get(id);
  }
  connectionsFor(id: string) {
    return this.connections.get(id) ?? [];
  }
}

function engineFor(writer: VaultWriter): ImportEngine {
  return new ImportEngine(
    { writer },
    {
      mappingRules: CIF_MAPPING_RULES,
      sourceRefBuilder: cifSourceRefBuilder,
      updatePolicy: "cif",
    },
  );
}

const v1Manifest = CifManifestSchema.parse({
  format: "codex-world-interchange",
  version: "1.0",
  source: { system: "tool", worldKey: "world" },
  world: { title: "W" },
  entities: [
    {
      key: "characters/hero",
      kind: "character",
      title: "Hero",
      summary: "Old summary",
      labels: ["adventurer"],
      content: { format: "markdown", body: "Old lore" },
    },
    {
      key: "characters/sidekick",
      kind: "character",
      title: "Sidekick",
      content: { format: "markdown", body: "" },
    },
  ],
  relationships: [
    { from: "characters/hero", to: "characters/sidekick", kind: "knows" },
  ],
  assets: [],
});

const v2Manifest = CifManifestSchema.parse({
  format: "codex-world-interchange",
  version: "1.0",
  source: { system: "tool", worldKey: "world" },
  world: { title: "W" },
  entities: [
    {
      // Same key (identity), renamed title + changed prose + added label.
      key: "characters/hero",
      kind: "character",
      title: "Hero Renamed",
      summary: "New summary",
      labels: ["adventurer", "legend"],
      content: { format: "markdown", body: "New lore" },
    },
    {
      key: "characters/sidekick",
      kind: "character",
      title: "Sidekick",
      content: { format: "markdown", body: "" },
    },
    {
      key: "characters/newcomer",
      kind: "character",
      title: "Newcomer",
      content: { format: "markdown", body: "" },
    },
  ],
  relationships: [
    // Identical to v1 — must not duplicate.
    { from: "characters/hero", to: "characters/sidekick", kind: "knows" },
    // New link to an entity the user will *skip* this pass (FR-008: skip
    // means "don't modify", not "doesn't exist" — the link must still
    // resolve to the existing vault entity).
    { from: "characters/newcomer", to: "characters/sidekick", kind: "knows" },
  ],
  assets: [],
});

describe("CIF re-import — update/skip/create without duplicates (T022/SC-004/US3)", () => {
  it("re-imports a modified export: renamed entity matches, new entity's link resolves to the skipped entity, identical relationship not duplicated, skip-all is a no-op", async () => {
    const writer = new ReimportFakeWriter();

    // --- Pass 1: initial import ---
    const { pkg: pkg1 } = normalizeCifPackage(v1Manifest);
    const engine = engineFor(writer);
    const session1 = await engine.prepare(pkg1);
    const report1 = await engine.commit(session1);
    expect(report1.entitiesCreated).toBe(2);
    expect(report1.relationshipsCreated).toBe(1);

    const heroId = (await writer.findBySourceRef(
      cifSourceRefBuilder("cif", pkg1.entityDrafts[0]),
    ))!.id;
    const sidekickId = (await writer.findBySourceRef(
      cifSourceRefBuilder("cif", pkg1.entityDrafts[1]),
    ))!.id;

    // --- Pass 2: re-import v2 with mixed decisions ---
    const { pkg: pkg2 } = normalizeCifPackage(v2Manifest);
    let session2 = await engine.prepare(pkg2);

    const heroRef = pkg2.entityDrafts[0].sourceId!;
    const sidekickRef = pkg2.entityDrafts[1].sourceId!;

    // Sanity: both pre-existing entities were matched, not staged as new.
    expect(
      session2.items.find((i) => i.draft.sourceId === heroRef)?.match,
    ).toBeTruthy();
    expect(
      session2.items.find((i) => i.draft.sourceId === sidekickRef)?.match,
    ).toBeTruthy();

    session2 = setMatchDecision(session2, heroRef, "update");
    session2 = setMatchDecision(session2, sidekickRef, "skip");

    const report2 = await engine.commit(session2);

    // Renamed entity matched and updated, never re-created.
    expect(report2.entitiesCreated).toBe(1); // only "newcomer"
    expect(report2.entitiesUpdated).toBe(1); // "hero"
    expect(report2.itemsSkipped).toBe(1); // "sidekick"

    const updatedHero = writer.get(heroId)!;
    expect(updatedHero.title).toBe("Hero Renamed");
    expect(updatedHero.content).toBe("New summary");
    expect(updatedHero.lore).toBe("New lore");
    expect(updatedHero.labels?.sort()).toEqual(["adventurer", "legend"]);
    // Category never silently changes.
    expect(updatedHero.type).toBe("character");

    // The identical hero->sidekick relationship is not duplicated.
    expect(report2.duplicatesSkipped.length).toBe(1);
    expect(writer.connectionsFor(heroId).length).toBe(1);

    // The new entity's link to the *skipped* sidekick still resolves
    // (FR-008: "skip" means "don't modify", not "doesn't exist").
    expect(report2.unresolvedReferences.length).toBe(0);
    const newcomerId = (await writer.findBySourceRef(
      cifSourceRefBuilder(
        "cif",
        pkg2.entityDrafts.find((d) => d.title === "Newcomer")!,
      ),
    ))!.id;
    const newcomerConnections = writer.connectionsFor(newcomerId);
    expect(newcomerConnections.length).toBe(1);
    expect(newcomerConnections[0].target).toBe(sidekickId);

    // --- Pass 3: skip everything — must be a total vault no-op ---
    const mutationsBefore = writer.mutationCount;
    let session3 = await engine.prepare(pkg2);
    for (const item of session3.items) {
      session3 = setItemDecision(
        session3,
        item.draft.sourceId!,
        item.match ? "include" : "ignore",
      );
      if (item.match) {
        session3 = setMatchDecision(session3, item.draft.sourceId!, "skip");
      }
    }
    const report3 = await engine.commit(session3);

    expect(writer.mutationCount).toBe(mutationsBefore);
    expect(report3.entitiesCreated).toBe(0);
    expect(report3.entitiesUpdated).toBe(0);
    expect(report3.relationshipsCreated).toBe(0);
    // Both relationships (hero->sidekick from pass 1, newcomer->sidekick
    // created in pass 2) already exist — a true no-op re-import.
    expect(report3.duplicatesSkipped.length).toBe(2);
  });
});
