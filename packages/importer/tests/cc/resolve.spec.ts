import { describe, it, expect } from "vitest";
import { ImportEngine } from "../../src/cc/engine";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";
import { setItemDecision } from "../../src/cc/session";
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
      sourceId: "char-1",
      sourceType: "Character",
      title: "Alice",
      content: "",
      tags: [],
    },
    {
      sourceId: "loc-1",
      sourceType: "Location",
      title: "Rivertown",
      content: "",
      tags: [],
    },
  ],
  relationshipDrafts: [
    { fromRef: "char-1", toRef: "loc-1", type: "located_in" },
  ],
  assetDrafts: [],
  warnings: [],
};

describe("link resolution", () => {
  it("resolves in-package link and creates connection on from entity only", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    const session = await engine.prepare(pkg);
    const report = await engine.commit(session);
    expect(report.relationshipsCreated).toBe(1);
    expect(report.unresolvedReferences).toHaveLength(0);
  });

  it("resolves in-package links that use full source refs", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    const fullRefPkg: CCImportPackage = {
      ...pkg,
      relationshipDrafts: [
        {
          fromRef: "kanka:Character:char-1",
          toRef: "kanka:Location:loc-1",
          type: "located_in",
        },
      ],
    };

    const session = await engine.prepare(fullRefPkg);
    const report = await engine.commit(session);

    expect(report.relationshipsCreated).toBe(1);
    expect(report.unresolvedReferences).toHaveLength(0);
  });

  it("resolves out-of-package targets by exact vault source ref", async () => {
    const writer = new FakeVaultWriter();
    writer.seed("existing-location", {
      type: "location",
      title: "Existing Rivertown",
      content: "",
      tags: [],
      discoverySource: "kanka:Location:existing-loc",
    });
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    const externalTargetPkg: CCImportPackage = {
      ...pkg,
      entityDrafts: [pkg.entityDrafts[0]],
      relationshipDrafts: [
        {
          fromRef: "char-1",
          toRef: "kanka:Location:existing-loc",
          type: "located_in",
        },
      ],
    };

    const session = await engine.prepare(externalTargetPkg);
    const report = await engine.commit(session);
    const alice = writer.allEntities().find((e) => e.title === "Alice");

    expect(report.relationshipsCreated).toBe(1);
    expect(report.unresolvedReferences).toHaveLength(0);
    expect(alice?.connections?.[0]?.target).toBe("existing-location");
  });

  it("unresolved reference when target does not exist", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    const badPkg: CCImportPackage = {
      ...pkg,
      relationshipDrafts: [
        { fromRef: "char-1", toRef: "nonexistent-99", type: "related_to" },
      ],
    };
    const session = await engine.prepare(badPkg);
    const report = await engine.commit(session);
    expect(report.unresolvedReferences).toHaveLength(1);
    expect(report.unresolvedReferences[0].toRef).toBe("nonexistent-99");
    expect(report.relationshipsCreated).toBe(0);
  });

  it("self-referential link is unresolved", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    const selfPkg: CCImportPackage = {
      ...pkg,
      relationshipDrafts: [
        { fromRef: "char-1", toRef: "char-1", type: "related_to" },
      ],
    };
    const session = await engine.prepare(selfPkg);
    const report = await engine.commit(session);
    expect(report.unresolvedReferences).toHaveLength(1);
    expect(report.unresolvedReferences[0].reason).toMatch(/self/i);
  });

  it("ignored endpoint makes relationship unresolved", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    let session = await engine.prepare(pkg);
    session = setItemDecision(session, "loc-1", "ignore");
    const report = await engine.commit(session);
    expect(report.unresolvedReferences).toHaveLength(1);
  });

  it("no fuzzy matching — different ids are not treated as the same", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    const fuzzyPkg: CCImportPackage = {
      ...pkg,
      relationshipDrafts: [
        { fromRef: "char-1", toRef: "char-1-copy", type: "related_to" },
      ],
    };
    const session = await engine.prepare(fuzzyPkg);
    const report = await engine.commit(session);
    expect(report.unresolvedReferences).toHaveLength(1);
  });
});
