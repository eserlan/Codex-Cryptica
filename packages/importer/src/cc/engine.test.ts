import { describe, it, expect, vi } from "vitest";
import { ImportEngine } from "./engine";
import type { CCImportPackage } from "./package";
import type { VaultWriter } from "./ports";
import { buildEntitySourceRef } from "./source-ref";

function mockWriter(overrides: Partial<VaultWriter> = {}): VaultWriter {
  let nextId = 0;
  return {
    findBySourceRef: vi.fn().mockResolvedValue(null),
    createEntity: vi
      .fn()
      .mockImplementation(async () => ({ id: `new-id-${nextId++}` })),
    updateEntity: vi.fn().mockResolvedValue(undefined),
    appendConnection: vi.fn().mockResolvedValue(undefined),
    saveAsset: vi.fn().mockResolvedValue({ ref: "asset-ref" }),
    ...overrides,
  };
}

function pkg(overrides: Partial<CCImportPackage> = {}): CCImportPackage {
  return {
    version: "1.0",
    sourceSystem: "test-system",
    sourceLabel: "Test World",
    entityDrafts: [
      {
        sourceId: "a",
        sourceType: "character",
        title: "A",
        content: "",
        tags: [],
      },
    ],
    relationshipDrafts: [],
    assetDrafts: [],
    warnings: [],
    ...overrides,
  };
}

describe("ImportEngine — sourceRefBuilder option (T007)", () => {
  it("uses buildEntitySourceRef by default (regression guard)", async () => {
    const writer = mockWriter();
    const engine = new ImportEngine({ writer });
    const session = await engine.prepare(pkg());
    expect(session.items[0].sourceRef).toBe(
      buildEntitySourceRef("test-system", {
        sourceId: "a",
        sourceType: "character",
      }),
    );
  });

  it("overrides the source ref in prepare() when sourceRefBuilder is supplied", async () => {
    const writer = mockWriter();
    const engine = new ImportEngine(
      { writer },
      {
        sourceRefBuilder: (system, draft) =>
          `custom:${system}:${draft.sourceId}`,
      },
    );
    const session = await engine.prepare(pkg());
    expect(session.items[0].sourceRef).toBe("custom:test-system:a");
  });

  it("uses the custom sourceRefBuilder to resolve relationship endpoints at commit", async () => {
    const writer = mockWriter();
    const engine = new ImportEngine(
      { writer },
      {
        sourceRefBuilder: (system, draft) =>
          `custom:${system}:${draft.sourceId}`,
      },
    );
    const session = await engine.prepare(
      pkg({
        entityDrafts: [
          {
            sourceId: "a",
            sourceType: "character",
            title: "A",
            content: "",
            tags: [],
          },
          {
            sourceId: "b",
            sourceType: "character",
            title: "B",
            content: "",
            tags: [],
          },
        ],
        relationshipDrafts: [
          {
            fromRef: "custom:test-system:a",
            toRef: "custom:test-system:b",
            type: "knows",
          },
        ],
      }),
    );
    const report = await engine.commit(session);
    expect(report.relationshipsCreated).toBe(1);
    expect(report.unresolvedReferences.length).toBe(0);
  });
});

describe("ImportEngine — date and alias draft fields (T007)", () => {
  it("passes startDate, endDate, and aliases through to entity creation", async () => {
    const writer = mockWriter();
    const engine = new ImportEngine({ writer });
    const session = await engine.prepare(
      pkg({
        entityDrafts: [
          {
            sourceId: "a",
            sourceType: "character",
            title: "A",
            content: "",
            tags: [],
            startDate: { year: 1142 },
            endDate: { year: 1150, month: 3 },
            aliases: ["The Wanderer"],
          },
        ],
      }),
    );
    await engine.commit(session);
    expect(writer.createEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: { year: 1142 },
        endDate: { year: 1150, month: 3 },
        aliases: ["The Wanderer"],
      }),
    );
  });

  it("omits date/alias fields when absent (no regression for existing adapters)", async () => {
    const writer = mockWriter();
    const engine = new ImportEngine({ writer });
    const session = await engine.prepare(pkg());
    await engine.commit(session);
    const call = (writer.createEntity as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(call.startDate).toBeUndefined();
    expect(call.endDate).toBeUndefined();
    expect(call.aliases).toBeUndefined();
  });
});
