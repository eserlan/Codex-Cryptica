import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CifManifestSchema } from "./package";
import {
  normalizeCifPackage,
  cifSourceRefBuilder,
  CIF_MAPPING_RULES,
} from "./normalize";
import { ImportEngine } from "../cc/engine";
import type { VaultWriter } from "../cc/ports";

const EXAMPLES_DIR = join(
  import.meta.dirname,
  "../../../../schemas/cif/1.0/examples",
);

function loadValidManifest() {
  const raw = JSON.parse(
    readFileSync(join(EXAMPLES_DIR, "valid-text-only.cif.json"), "utf-8"),
  );
  return CifManifestSchema.parse(raw);
}

function mockWriter(overrides: Partial<VaultWriter> = {}): VaultWriter {
  let nextId = 0;
  return {
    findBySourceRef: vi.fn().mockResolvedValue(null),
    createEntity: vi
      .fn()
      .mockImplementation(async () => ({ id: `id-${nextId++}` })),
    updateEntity: vi.fn().mockResolvedValue(undefined),
    appendConnection: vi.fn().mockResolvedValue(undefined),
    saveAsset: vi.fn().mockResolvedValue({ ref: "asset-ref" }),
    ...overrides,
  };
}

function engineFor(writer: VaultWriter): ImportEngine {
  return new ImportEngine(
    { writer },
    { mappingRules: CIF_MAPPING_RULES, sourceRefBuilder: cifSourceRefBuilder },
  );
}

describe("CIF import — end to end (T010)", () => {
  it("imports the published fixture: entities before connections, report matches the fixture", async () => {
    const manifest = loadValidManifest();
    const { pkg } = normalizeCifPackage(manifest);
    const writer = mockWriter();
    const engine = engineFor(writer);

    const session = await engine.prepare(pkg);
    expect(session.items.length).toBe(manifest.entities.length);

    const creationOrder: string[] = [];
    (writer.createEntity as ReturnType<typeof vi.fn>).mockImplementation(
      async (input: { title: string }) => {
        creationOrder.push(`entity:${input.title}`);
        return { id: `id-${creationOrder.length}` };
      },
    );
    (writer.appendConnection as ReturnType<typeof vi.fn>).mockImplementation(
      async () => {
        creationOrder.push("connection");
      },
    );

    const report = await engine.commit(session);

    expect(report.entitiesCreated).toBe(manifest.entities.length);
    expect(report.relationshipsCreated).toBe(manifest.relationships.length);
    expect(report.failures.length).toBe(0);

    const lastEntityIndex = creationOrder.lastIndexOf(
      creationOrder.filter((e) => e.startsWith("entity:")).slice(-1)[0],
    );
    const firstConnectionIndex = creationOrder.indexOf("connection");
    expect(firstConnectionIndex).toBeGreaterThan(lastEntityIndex);
  });

  it("resolves a parent reference to the actual created entity id", async () => {
    const manifest = CifManifestSchema.parse({
      format: "codex-world-interchange",
      version: "1.0",
      source: { system: "tool", worldKey: "world" },
      world: { title: "W" },
      entities: [
        {
          key: "places/harbor",
          kind: "location",
          title: "Harbor",
          content: { format: "markdown", body: "" },
        },
        {
          key: "places/harbor/docks",
          kind: "location",
          title: "Docks",
          parent: "places/harbor",
          content: { format: "markdown", body: "" },
        },
      ],
      relationships: [],
      assets: [],
    });
    const { pkg } = normalizeCifPackage(manifest);
    const writer = mockWriter();
    const engine = engineFor(writer);
    const session = await engine.prepare(pkg);
    await engine.commit(session);

    // parent is resolved to the actual created entity id via a follow-up
    // updateEntity call (never written as a raw source/package reference).
    const updateCalls = (writer.updateEntity as ReturnType<typeof vi.fn>).mock
      .calls;
    const parentUpdate = updateCalls.find(
      (call) => call[1].parent !== undefined,
    );
    expect(parentUpdate?.[1].parent).toMatch(/^id-/);
    expect(parentUpdate?.[1].parent).not.toContain("cif:entity:");
  });

  it("reads an undirected bond correctly from both endpoints", async () => {
    const manifest = CifManifestSchema.parse({
      format: "codex-world-interchange",
      version: "1.0",
      source: { system: "tool", worldKey: "world" },
      world: { title: "W" },
      entities: [
        {
          key: "characters/a",
          kind: "character",
          title: "A",
          content: { format: "markdown", body: "" },
        },
        {
          key: "characters/b",
          kind: "character",
          title: "B",
          content: { format: "markdown", body: "" },
        },
      ],
      relationships: [
        {
          from: "characters/a",
          to: "characters/b",
          kind: "spouse_of",
          directed: false,
        },
      ],
      assets: [],
    });
    const { pkg } = normalizeCifPackage(manifest);
    const writer = mockWriter();
    const engine = engineFor(writer);
    const session = await engine.prepare(pkg);
    const report = await engine.commit(session);

    expect(report.relationshipsCreated).toBe(2);
    const calls = (writer.appendConnection as ReturnType<typeof vi.fn>).mock
      .calls;
    expect(calls.length).toBe(2);
    expect(calls[0][1].type).toBe("spouse_of");
    expect(calls[1][1].type).toBe("spouse_of");
  });
});

describe("CIF import — cancellation (T010/FR-008/FR-009/SC-007)", () => {
  it("prepare() without commit() invokes zero writer mutation methods", async () => {
    const manifest = loadValidManifest();
    const { pkg } = normalizeCifPackage(manifest);
    const writer = mockWriter();
    const engine = engineFor(writer);

    await engine.prepare(pkg);

    expect(writer.createEntity).not.toHaveBeenCalled();
    expect(writer.updateEntity).not.toHaveBeenCalled();
    expect(writer.appendConnection).not.toHaveBeenCalled();
  });

  it("an AbortSignal fired between the entity and connection phases leaves zero dangling references", async () => {
    const manifest = CifManifestSchema.parse({
      format: "codex-world-interchange",
      version: "1.0",
      source: { system: "tool", worldKey: "world" },
      world: { title: "W" },
      entities: [
        {
          key: "characters/a",
          kind: "character",
          title: "A",
          content: { format: "markdown", body: "" },
        },
        {
          key: "characters/b",
          kind: "character",
          title: "B",
          content: { format: "markdown", body: "" },
        },
      ],
      relationships: [
        { from: "characters/a", to: "characters/b", kind: "knows" },
      ],
      assets: [],
    });
    const { pkg } = normalizeCifPackage(manifest);

    const controller = new AbortController();
    const writer = mockWriter({
      createEntity: vi.fn().mockImplementation(async () => {
        // Abort right after entities finish, before the connection phase runs.
        controller.abort();
        return { id: `id-${Math.random()}` };
      }),
    });
    const engine = engineFor(writer);
    const session = await engine.prepare(pkg);

    await expect(
      engine.commit(session, undefined, controller.signal),
    ).rejects.toThrow("Import aborted");

    // No connection was written referencing an entity — appendConnection
    // must never have been called past the abort point.
    expect(writer.appendConnection).not.toHaveBeenCalled();
  });
});

describe("CIF import — warning-report completeness (T015/FR-017)", () => {
  it("a test-corpus package produces a report entry for every droppable item", async () => {
    const manifest = CifManifestSchema.parse({
      format: "codex-world-interchange",
      version: "1.0",
      source: { system: "tool" },
      world: { title: "W" },
      entities: [
        {
          key: "characters/a",
          kind: "deity",
          title: "A",
          content: { format: "markdown", body: "" },
          extensions: { "some-tool": { customField: "value" } },
          dates: { start: { value: "not-a-date", precision: "year" } },
        },
      ],
      relationships: [],
      assets: [
        {
          key: "art/a.png",
          mediaType: "image/png",
          url: "https://example.invalid/a.png",
        },
      ],
    });
    const { pkg } = normalizeCifPackage(manifest);
    const writer = mockWriter();
    const engine = engineFor(writer);
    const session = await engine.prepare(pkg);
    const report = await engine.commit(session);

    // Unmapped kind ("deity") surfaces via the engine's generic
    // typeFallback mechanism, not a CIF-specific warning code.
    expect(
      report.typeFallbacks.some(
        (f) => f.sourceRef === session.items[0].sourceRef,
      ),
    ).toBe(true);
    expect(
      report.warnings.some((w) => w.code === "cif.unknown-extension"),
    ).toBe(true);
    expect(
      report.warnings.some((w) => w.code === "cif.assets-not-imported"),
    ).toBe(true);
    expect(report.warnings.some((w) => w.code === "cif.date-precision")).toBe(
      true,
    );
    // No worldKey on this package's source, too.
    expect(report.warnings.some((w) => w.code === "cif.no-world-key")).toBe(
      true,
    );
  });
});

describe("CIF import — client-side & non-leaking (FR-018)", () => {
  it("no CIF module references network APIs", async () => {
    const fs = await import("node:fs");
    const files = [
      "package.ts",
      "parse.ts",
      "validate.ts",
      "normalize.ts",
      "report.ts",
    ];
    for (const file of files) {
      const path = join(import.meta.dirname, file);
      if (!fs.existsSync(path)) continue;
      const source = fs.readFileSync(path, "utf-8");
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/XMLHttpRequest/);
      expect(source).not.toMatch(/WebSocket/);
    }
  });

  it("error and warning messages carry record keys and rule names, never raw content bodies", async () => {
    const manifest = CifManifestSchema.parse({
      format: "codex-world-interchange",
      version: "1.0",
      source: { system: "tool", worldKey: "world" },
      world: { title: "W" },
      entities: [
        {
          key: "characters/a",
          kind: "unknown-kind",
          title: "A",
          content: {
            format: "markdown",
            body: "SECRET-PLAYER-CONTENT-SHOULD-NOT-LEAK",
          },
        },
      ],
      relationships: [],
      assets: [],
    });
    const { warnings } = normalizeCifPackage(manifest);
    for (const warning of warnings) {
      expect(warning.message).not.toContain(
        "SECRET-PLAYER-CONTENT-SHOULD-NOT-LEAK",
      );
    }
  });
});
