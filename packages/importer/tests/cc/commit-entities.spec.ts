import { describe, it, expect, vi } from "vitest";
import { ImportEngine } from "../../src/cc/engine";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";
import { kankaMinimal } from "./fixtures/kanka-minimal";
import { setItemDecision } from "../../src/cc/session";

const rules = {
  rules: [
    { when: { sourceType: "Character" }, thenType: "character" },
    { when: { sourceType: "Location" }, thenType: "location" },
  ],
  defaultType: "note",
};

describe("commit — entities", () => {
  it("writes only included drafts", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    let session = await engine.prepare(kankaMinimal);
    session = setItemDecision(session, "678", "ignore");
    const report = await engine.commit(session);
    expect(report.entitiesCreated).toBe(1);
    expect(report.itemsSkipped).toBe(1);
    expect(writer.allEntities()).toHaveLength(1);
  });

  it("every created entity carries discoverySource", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    const session = await engine.prepare(kankaMinimal);
    await engine.commit(session);
    const entities = writer.allEntities().filter((e) => !e.connections?.length);
    expect(entities.every((e) => !!e.discoverySource)).toBe(true);
    expect(
      writer
        .allEntities()
        .find((e) => e.discoverySource === "kanka:Character:12345"),
    ).toBeTruthy();
  });

  it("report counts reconcile (created + skipped = total drafts)", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });
    let session = await engine.prepare(kankaMinimal);
    session = setItemDecision(session, "12345", "ignore");
    const report = await engine.commit(session);
    expect(
      report.entitiesCreated + report.itemsSkipped + report.failures.length,
    ).toBe(kankaMinimal.entityDrafts.length);
  });

  it("records per-item failure without aborting other items", async () => {
    const writer = new FakeVaultWriter();
    let callCount = 0;
    const faultyWriter = {
      ...writer,
      findBySourceRef: writer.findBySourceRef.bind(writer),
      createEntity: async (
        e: Parameters<FakeVaultWriter["createEntity"]>[0],
      ) => {
        callCount++;
        if (callCount === 1) throw new Error("disk full");
        return writer.createEntity(e);
      },
      updateEntity: writer.updateEntity.bind(writer),
      appendConnection: writer.appendConnection.bind(writer),
      saveAsset: writer.saveAsset.bind(writer),
    };
    const engine = new ImportEngine(
      { writer: faultyWriter },
      { mappingRules: rules },
    );
    const session = await engine.prepare(kankaMinimal);
    const report = await engine.commit(session);
    expect(report.failures.length).toBe(1);
    expect(report.entitiesCreated).toBe(1);
  });

  it("uses batch create when the writer supports it", async () => {
    const writer = new FakeVaultWriter();
    const batchCreateEntities = vi.fn(async (entities) =>
      Promise.all(entities.map((entity) => writer.createEntity(entity))),
    );
    const createEntity = vi.fn(writer.createEntity.bind(writer));

    const engine = new ImportEngine(
      {
        writer: {
          findBySourceRef: writer.findBySourceRef.bind(writer),
          batchCreateEntities,
          createEntity,
          updateEntity: writer.updateEntity.bind(writer),
          appendConnection: writer.appendConnection.bind(writer),
          saveAsset: writer.saveAsset.bind(writer),
        },
      },
      { mappingRules: rules },
    );

    const session = await engine.prepare(kankaMinimal);
    const report = await engine.commit(session);

    expect(report.entitiesCreated).toBe(2);
    expect(batchCreateEntities).toHaveBeenCalledTimes(1);
    expect(createEntity).not.toHaveBeenCalled();
  });
});
