import { describe, it, expect } from "vitest";
import { ImportEngine } from "../../src/cc/engine";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";
import { kankaMinimal } from "./fixtures/kanka-minimal";

const rules = {
  rules: [
    { when: { sourceType: "Character" }, thenType: "character" },
    { when: { sourceType: "Location" }, thenType: "location" },
  ],
  defaultType: "note",
};

describe("determinism", () => {
  it("same package + rules produces same entity field values and source refs across two runs", async () => {
    const writer1 = new FakeVaultWriter();
    const engine1 = new ImportEngine(
      { writer: writer1 },
      { mappingRules: rules },
    );
    const s1 = await engine1.prepare(kankaMinimal);
    const r1 = await engine1.commit(s1);

    const writer2 = new FakeVaultWriter();
    const engine2 = new ImportEngine(
      { writer: writer2 },
      { mappingRules: rules },
    );
    const s2 = await engine2.prepare(kankaMinimal);
    const r2 = await engine2.commit(s2);

    // Content-bearing fields should be identical
    const entities1 = writer1
      .allEntities()
      .map(({ id: _id, ...e }) => e)
      .sort((a, b) => a.title.localeCompare(b.title));
    const entities2 = writer2
      .allEntities()
      .map(({ id: _id, ...e }) => e)
      .sort((a, b) => a.title.localeCompare(b.title));
    expect(entities1).toEqual(entities2);

    // Report structure should match (ignoring committedAt timestamp)
    expect(r1.entitiesCreated).toBe(r2.entitiesCreated);
    expect(r1.relationshipsCreated).toBe(r2.relationshipsCreated);
    expect(r1.unresolvedReferences).toEqual(r2.unresolvedReferences);
  });

  it("source refs are stable across runs", async () => {
    const writer1 = new FakeVaultWriter();
    const engine1 = new ImportEngine(
      { writer: writer1 },
      { mappingRules: rules },
    );
    const s1 = await engine1.prepare(kankaMinimal);
    await engine1.commit(s1);

    const writer2 = new FakeVaultWriter();
    const engine2 = new ImportEngine(
      { writer: writer2 },
      { mappingRules: rules },
    );
    const s2 = await engine2.prepare(kankaMinimal);
    await engine2.commit(s2);

    const refs1 = writer1
      .allEntities()
      .map((e) => e.discoverySource)
      .sort();
    const refs2 = writer2
      .allEntities()
      .map((e) => e.discoverySource)
      .sort();
    expect(refs1).toEqual(refs2);
  });
});
