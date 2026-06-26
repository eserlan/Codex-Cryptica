import { describe, it, expect } from "vitest";
import { ImportEngine } from "../../src/cc/engine";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";
import type { CCImportPackage } from "../../src/cc/package";

const base: CCImportPackage = {
  version: "1.0",
  sourceSystem: "kanka",
  sourceLabel: "Test",
  entityDrafts: [{ sourceId: "e1", title: "Alice", content: "", tags: [] }],
  relationshipDrafts: [],
  assetDrafts: [],
  warnings: [],
};

describe("commit — assets", () => {
  it("eligible asset is passed to saveAsset", async () => {
    const writer = new FakeVaultWriter();
    let savedCount = 0;
    const trackingWriter = {
      findBySourceRef: writer.findBySourceRef.bind(writer),
      createEntity: writer.createEntity.bind(writer),
      updateEntity: writer.updateEntity.bind(writer),
      appendConnection: writer.appendConnection.bind(writer),
      saveAsset: async (a: Parameters<FakeVaultWriter["saveAsset"]>[0]) => {
        savedCount++;
        return writer.saveAsset(a);
      },
    };
    const engine = new ImportEngine({ writer: trackingWriter });
    const pkg: CCImportPackage = {
      ...base,
      assetDrafts: [
        {
          id: "img1",
          bytes: new Blob(["fake image bytes"]),
          originalName: "portrait.jpg",
          mimeType: "image/jpeg",
          placementRef: "e1",
        },
      ],
    };
    const session = await engine.prepare(pkg);
    const report = await engine.commit(session);
    expect(savedCount).toBe(1);
    expect(report.assetsImported).toBe(1);
    expect(report.assetsSkipped).toHaveLength(0);
  });

  it("asset with no bytes is skipped with warning (non-fatal)", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer });
    const pkg: CCImportPackage = {
      ...base,
      assetDrafts: [
        {
          id: "img-missing",
          originalName: "missing.jpg",
          mimeType: "image/jpeg",
          placementRef: "e1",
        },
      ],
    };
    const session = await engine.prepare(pkg);
    const report = await engine.commit(session);
    expect(report.assetsImported).toBe(0);
    expect(report.assetsSkipped).toHaveLength(1);
    expect(report.entitiesCreated).toBe(1); // entity still created
  });

  it("oversized asset (>25MB) is skipped without blocking import", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer });
    const bigBytes = new Uint8Array(26 * 1024 * 1024); // 26 MB
    const pkg: CCImportPackage = {
      ...base,
      assetDrafts: [
        {
          id: "big-img",
          bytes: bigBytes,
          originalName: "huge.png",
          mimeType: "image/png",
          placementRef: "e1",
        },
      ],
    };
    const session = await engine.prepare(pkg);
    const report = await engine.commit(session);
    expect(report.assetsSkipped).toHaveLength(1);
    expect(report.assetsSkipped[0].reason).toMatch(/size/i);
    expect(report.entitiesCreated).toBe(1);
  });
});
