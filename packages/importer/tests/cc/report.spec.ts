import { describe, it, expect } from "vitest";
import { ImportEngine } from "../../src/cc/engine";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";
import { setItemDecision, setMatchDecision } from "../../src/cc/session";
import type { CCImportPackage } from "../../src/cc/package";

const rules = {
  rules: [
    { when: { sourceType: "Character" }, thenType: "character" },
    { when: { sourceType: "Location" }, thenType: "location" },
  ],
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
      content: "",
      tags: [],
    },
    {
      sourceId: "l1",
      sourceType: "Location",
      title: "Town",
      content: "",
      tags: [],
    },
  ],
  relationshipDrafts: [
    { fromRef: "c1", toRef: "l1", type: "located_in" },
    { fromRef: "c1", toRef: "missing-99", type: "knows" },
  ],
  assetDrafts: [],
  warnings: [],
};

describe("import report", () => {
  it("relationshipsCreated and unresolvedReferences are correct", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    const session = await engine.prepare(pkg);
    const report = await engine.commit(session);
    expect(report.relationshipsCreated).toBe(1);
    expect(report.unresolvedReferences).toHaveLength(1);
    expect(report.unresolvedReferences[0].toRef).toBe("missing-99");
  });

  it("entitiesUpdated counted on re-import update choice", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    // First import
    const s1 = await engine.prepare(pkg);
    await engine.commit(s1);
    // Second import — choose update
    let s2 = await engine.prepare(pkg);
    s2 = setMatchDecision(s2, "c1", "update");
    s2 = setMatchDecision(s2, "l1", "update");
    const report2 = await engine.commit(s2);
    expect(report2.entitiesUpdated).toBe(2);
    expect(report2.entitiesCreated).toBe(0);
  });

  it("reconciliation invariant: created+updated+skipped+failures = total entity drafts", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    let session = await engine.prepare(pkg);
    session = setItemDecision(session, "l1", "ignore");
    const report = await engine.commit(session);
    const total =
      report.entitiesCreated +
      report.entitiesUpdated +
      report.itemsSkipped +
      report.failures.filter((f) => f.stage === "entity").length;
    expect(total).toBe(pkg.entityDrafts.length);
  });
});
