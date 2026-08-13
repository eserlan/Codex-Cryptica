import { describe, it, expect } from "vitest";
import { ImportEngine } from "../../src/cc/engine";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";
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
    {
      fromRef: "char-1",
      toRef: "loc-1",
      type: "located_in",
      label: "lives in",
    },
  ],
  assetDrafts: [],
  warnings: [],
};

describe("commit — connections", () => {
  it("connection written on from entity only (not on target)", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    const session = await engine.prepare(pkg);
    await engine.commit(session);

    // The connection should appear on Alice (char-1), not on Rivertown (loc-1)
    const alice = writer.allEntities().find((e) => e.title === "Alice");
    const rivertown = writer.allEntities().find((e) => e.title === "Rivertown");
    expect(alice?.connections?.length).toBeGreaterThan(0);
    expect(rivertown?.connections?.length ?? 0).toBe(0);
  });

  it("type and label are preserved on the connection", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    const session = await engine.prepare(pkg);
    await engine.commit(session);
    const alice = writer.allEntities().find((e) => e.title === "Alice");
    const conn = alice?.connections?.[0];
    expect(conn?.type).toBe("located_in");
    expect(conn?.label).toBe("lives in");
  });

  it("entities are created before connections are written", async () => {
    const order: string[] = [];
    const writer = new FakeVaultWriter();
    const trackingWriter = {
      findBySourceRef: writer.findBySourceRef.bind(writer),
      createEntity: async (
        e: Parameters<FakeVaultWriter["createEntity"]>[0],
      ) => {
        order.push("create:" + e.title);
        return writer.createEntity(e);
      },
      updateEntity: writer.updateEntity.bind(writer),
      appendConnection: async (
        id: string,
        conn: Parameters<FakeVaultWriter["appendConnection"]>[1],
      ) => {
        order.push("connection");
        return writer.appendConnection(id, conn);
      },
      saveAsset: writer.saveAsset.bind(writer),
    };
    const engine = new ImportEngine(
      { writer: trackingWriter },
      { mappingRules: rules },
    );
    const session = await engine.prepare(pkg);
    await engine.commit(session);
    const createIdx = order.findIndex((o) => o.startsWith("create:"));
    const connIdx = order.indexOf("connection");
    expect(createIdx).toBeLessThan(connIdx);
  });
});
