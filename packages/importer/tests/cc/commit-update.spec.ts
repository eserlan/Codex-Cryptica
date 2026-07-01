import { describe, it, expect } from "vitest";
import { ImportEngine } from "../../src/cc/engine";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";
import { setMatchDecision } from "../../src/cc/session";
import type { CCImportPackage } from "../../src/cc/package";

const rules = {
  rules: [{ when: { sourceType: "Character" }, thenType: "character" }],
  defaultType: "note",
};

const pkg: CCImportPackage = {
  version: "1.0",
  sourceSystem: "kanka",
  sourceLabel: "Test",
  entityDrafts: [
    {
      sourceId: "c1",
      sourceType: "Character",
      title: "Alice",
      content: "Original content.",
      tags: ["pc"],
    },
  ],
  relationshipDrafts: [],
  assetDrafts: [],
  warnings: [],
};

describe("repeat import — match detection", () => {
  it("draft with existing source ref is flagged as match", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    await engine.commit(await engine.prepare(pkg));

    const session2 = await engine.prepare(pkg);
    expect(session2.items[0].match).not.toBeNull();
    expect(session2.items[0].match?.entityId).toBeTruthy();
  });

  it("default match decision is non-destructive (skip)", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    await engine.commit(await engine.prepare(pkg));

    const session2 = await engine.prepare(pkg);
    expect(session2.items[0].matchDecision).toBe("skip");
  });

  it("differing source IDs are NOT proposed as duplicates", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });

    const pkg2: CCImportPackage = {
      ...pkg,
      entityDrafts: [
        ...pkg.entityDrafts,
        {
          sourceId: "c1-copy",
          sourceType: "Character",
          title: "Alice",
          content: "Copy.",
          tags: [],
        },
      ],
    };
    const session = await engine.prepare(pkg2);
    // both items should have null match (fresh vault)
    expect(session.items.every((_i) => _i.match === null)).toBe(true);
  });
});

describe("update semantics", () => {
  it("update overwrites only draft fields, preserves vault-only fields", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    // First import
    const s1 = await engine.prepare(pkg);
    const r1 = await engine.commit(s1);
    expect(r1.entitiesCreated).toBe(1);

    // Simulate user adding an image after import
    const entityId = writer.allEntities()[0].id;
    await writer.updateEntity(entityId, {
      metadata: { image: "portrait.jpg" },
    });

    // Re-import with changed content, choose update
    const changedPkg: CCImportPackage = {
      ...pkg,
      entityDrafts: [{ ...pkg.entityDrafts[0], content: "Updated content." }],
    };
    let s2 = await engine.prepare(changedPkg);
    s2 = setMatchDecision(s2, "c1", "update");
    await engine.commit(s2);

    const updated = writer.getEntity(entityId)!;
    expect(updated.content).toBe("Updated content."); // overwritten
    expect(updated.metadata?.image).toBe("portrait.jpg"); // preserved
    expect(updated.discoverySource).toBe("kanka:Character:c1"); // preserved
  });

  it("skip does not write anything", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    await engine.commit(await engine.prepare(pkg));

    const before = JSON.stringify(writer.allEntities());
    const s2 = await engine.prepare(pkg); // default matchDecision = skip
    const report = await engine.commit(s2);
    expect(report.itemsSkipped).toBe(1);
    expect(JSON.stringify(writer.allEntities())).toBe(before);
  });

  it("create makes a new entity even when match exists", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    await engine.commit(await engine.prepare(pkg));

    let s2 = await engine.prepare(pkg);
    s2 = setMatchDecision(s2, "c1", "create");
    const report = await engine.commit(s2);
    expect(report.entitiesCreated).toBe(1);
    expect(writer.allEntities()).toHaveLength(2);
  });
});
