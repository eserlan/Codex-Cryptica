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
    appendConnection: vi.fn().mockResolvedValue({ created: true }),
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

describe("ImportEngine — parent reference resolution (T010 regression)", () => {
  it("resolves parentRef to the actual created entity id, never a raw source ref", async () => {
    const writer = mockWriter();
    const engine = new ImportEngine({ writer });
    const session = await engine.prepare(
      pkg({
        entityDrafts: [
          {
            sourceId: "parent",
            sourceType: "location",
            title: "Parent",
            content: "",
            tags: [],
          },
          {
            sourceId: "child",
            sourceType: "location",
            title: "Child",
            content: "",
            tags: [],
            parentRef: buildEntitySourceRef("test-system", {
              sourceId: "parent",
              sourceType: "location",
            }),
          },
        ],
      }),
    );
    await engine.commit(session);

    const createCalls = (writer.createEntity as ReturnType<typeof vi.fn>).mock
      .calls;
    for (const call of createCalls) {
      expect(call[0].parent).toBeUndefined();
    }

    const updateCalls = (writer.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls;
    const parentUpdate = updateCalls.find(
      (call) => call[1].parent !== undefined,
    );
    expect(parentUpdate).toBeTruthy();
    expect(parentUpdate?.[1].parent).not.toContain("test-system");
  });

  it("reports an unresolvable parent instead of writing a dangling reference", async () => {
    const writer = mockWriter();
    const engine = new ImportEngine({ writer });
    const session = await engine.prepare(
      pkg({
        entityDrafts: [
          {
            sourceId: "child",
            sourceType: "location",
            title: "Child",
            content: "",
            tags: [],
            parentRef: "does-not-exist",
          },
        ],
      }),
    );
    const report = await engine.commit(session);

    expect(report.unresolvedReferences.some((r) => r.type === "parent")).toBe(
      true,
    );
    expect(writer.updateEntity).not.toHaveBeenCalled();
  });
});

describe("ImportEngine — getEntityFields / PreviewItem.existing (T017)", () => {
  it("populates existing from a matched item when the writer supports getEntityFields", async () => {
    const writer = mockWriter({
      findBySourceRef: vi.fn().mockResolvedValue({ id: "existing-id" }),
      getEntityFields: vi.fn().mockResolvedValue({
        title: "Old Title",
        content: "Old content",
        type: "character",
      }),
    });
    const engine = new ImportEngine({ writer });
    const session = await engine.prepare(pkg());
    expect(session.items[0].existing).toEqual({
      title: "Old Title",
      content: "Old content",
      type: "character",
    });
  });

  it("leaves existing undefined when the writer has no getEntityFields (no crash)", async () => {
    const writer = mockWriter({
      findBySourceRef: vi.fn().mockResolvedValue({ id: "existing-id" }),
    });
    const engine = new ImportEngine({ writer });
    const session = await engine.prepare(pkg());
    expect(session.items[0].existing).toBeUndefined();
  });

  it("leaves existing undefined for unmatched items even when getEntityFields exists", async () => {
    const writer = mockWriter({
      getEntityFields: vi.fn().mockResolvedValue({
        title: "Should not be called",
        content: "",
        type: "character",
      }),
    });
    const engine = new ImportEngine({ writer });
    const session = await engine.prepare(pkg());
    expect(session.items[0].existing).toBeUndefined();
  });
});

describe("ImportEngine — updatePolicy: 'cif' (T017/FR-015/FR-016)", () => {
  function pkgForUpdate(
    draftOverrides: Partial<CCImportPackage["entityDrafts"][0]> = {},
  ): CCImportPackage {
    return pkg({
      entityDrafts: [
        {
          sourceId: "a",
          sourceType: "character",
          title: "New Title",
          content: "New content",
          lore: "New lore",
          tags: [],
          labels: ["new-label"],
          aliases: ["New Alias"],
          startDate: { year: 1200 },
          endDate: { year: 1210 },
          ...draftOverrides,
        },
      ],
    });
  }

  it("replaces title/content/lore/dates and unions labels/aliases with the existing entity", async () => {
    const writer = mockWriter({
      findBySourceRef: vi.fn().mockResolvedValue({ id: "existing-id" }),
      getEntityFields: vi.fn().mockResolvedValue({
        title: "Old Title",
        content: "Old content",
        lore: "Old lore",
        labels: ["old-label"],
        aliases: ["Old Alias"],
        type: "character",
      }),
    });
    const engine = new ImportEngine({ writer }, { updatePolicy: "cif" });
    const session = await engine.prepare(pkgForUpdate());
    const updated = { ...session.items[0], matchDecision: "update" as const };
    await engine.commit({ ...session, items: [updated] });

    const patch = (writer.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls[0][1];
    expect(patch.title).toBe("New Title");
    expect(patch.content).toBe("New content");
    expect(patch.lore).toBe("New lore");
    expect(patch.startDate).toEqual({ year: 1200 });
    expect(patch.endDate).toEqual({ year: 1210 });
    expect(patch.labels.sort()).toEqual(["new-label", "old-label"]);
    expect(patch.aliases.sort()).toEqual(["New Alias", "Old Alias"]);
  });

  it("never includes type in the patch, warning instead when the mapped kind differs", async () => {
    const writer = mockWriter({
      findBySourceRef: vi.fn().mockResolvedValue({ id: "existing-id" }),
      getEntityFields: vi.fn().mockResolvedValue({
        title: "Old Title",
        content: "",
        type: "location",
      }),
    });
    const engine = new ImportEngine({ writer }, { updatePolicy: "cif" });
    const session = await engine.prepare(pkgForUpdate());
    const updated = { ...session.items[0], matchDecision: "update" as const };
    const report = await engine.commit({ ...session, items: [updated] });

    const patch = (writer.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls[0][1];
    expect(patch.type).toBeUndefined();
    expect(report.warnings.some((w) => w.code === "cif.kind-changed")).toBe(
      true,
    );
  });

  it("includes parent in the patch only via the later resolution pass, never directly from the draft", async () => {
    const writer = mockWriter({
      findBySourceRef: vi.fn().mockResolvedValue({ id: "existing-id" }),
      getEntityFields: vi.fn().mockResolvedValue({
        title: "Old Title",
        content: "",
        type: "character",
      }),
    });
    const engine = new ImportEngine({ writer }, { updatePolicy: "cif" });
    const session = await engine.prepare(pkgForUpdate());
    const updated = { ...session.items[0], matchDecision: "update" as const };
    await engine.commit({ ...session, items: [updated] });

    // The direct update-patch call must never itself carry a `parent` key —
    // parent resolution is deferred to the shared later pass.
    const patch = (writer.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls[0][1];
    expect(patch.parent).toBeUndefined();
  });

  it("default 'replace-all' policy is byte-identical to today (chronica regression guard)", async () => {
    const writer = mockWriter({
      findBySourceRef: vi.fn().mockResolvedValue({ id: "existing-id" }),
    });
    const engine = new ImportEngine(
      { writer },
      {
        mappingRules: {
          rules: [{ when: { sourceType: "character" }, thenType: "character" }],
          defaultType: "note",
        },
      },
    );
    const session = await engine.prepare(pkgForUpdate());
    const updated = { ...session.items[0], matchDecision: "update" as const };
    await engine.commit({ ...session, items: [updated] });

    const patch = (writer.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls[0][1];
    expect(patch.type).toBe("character");
    expect(patch.labels).toEqual(["new-label"]);
    expect(patch.aliases).toEqual(["New Alias"]);
  });
});

describe("ImportEngine — duplicatesSkipped (T017/FR-013)", () => {
  it("counts an appendConnection {created:false} result as a duplicate, not a new relationship", async () => {
    const writer = mockWriter({
      appendConnection: vi.fn().mockResolvedValue({ created: false }),
    });
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
            fromRef: buildEntitySourceRef("test-system", {
              sourceId: "a",
              sourceType: "character",
            }),
            toRef: buildEntitySourceRef("test-system", {
              sourceId: "b",
              sourceType: "character",
            }),
            type: "knows",
          },
        ],
      }),
    );
    const report = await engine.commit(session);

    expect(report.relationshipsCreated).toBe(0);
    expect(report.duplicatesSkipped.length).toBe(1);
    expect(report.duplicatesSkipped[0].type).toBe("knows");
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
