import { describe, expect, it } from "vitest";
import type { Canvas } from "@codex/canvas-engine";
import type { Entity, ReportProvenance } from "schema";
import { resolveReportSource } from "./report-source-resolver";

const e = (id: string, target?: string): Entity =>
  ({
    id,
    type: "character",
    title: id,
    labels: [],
    aliases: [],
    content: "",
    status: "active",
    connections: target ? [{ target, type: "friend" }] : [],
  }) as unknown as Entity;

const store: Record<string, Entity> = { a: e("a", "b"), b: e("b"), c: e("c") };
const canvas = {
  id: "cv",
  name: "C",
  nodes: [
    { id: "n1", type: "entity", entityId: "a", position: { x: 0, y: 0 } },
    { id: "n2", type: "entity", entityId: "b", position: { x: 0, y: 0 } },
    { id: "n3", type: "entity", entityId: "c", position: { x: 0, y: 0 } },
  ],
  edges: [{ id: "e1", source: "n1", target: "n2", label: "ally" }],
} as unknown as Canvas;

const deps = {
  getEntity: (id: string) => store[id],
  getCanvas: (id: string) => (id === "cv" ? canvas : undefined),
};
const base: Omit<ReportProvenance, "origin"> = {
  include: {
    descriptions: true,
    relationships: true,
    factionsAffiliations: true,
    portraits: true,
    notes: true,
    gmOnlySecrets: false,
  },
  detail: "standard",
  generatedAt: 1,
  contentHash: "x",
};

describe("resolveReportSource", () => {
  it("rebuilds an entire-canvas report from the canvas", () => {
    const { input } = resolveReportSource(
      { ...base, origin: "canvas", canvasId: "cv", selection: "entire" },
      deps,
    );
    expect(input?.entities).toHaveLength(3);
    expect(input?.relationships).toEqual([
      { sourceId: "a", targetId: "b", label: "ally" },
    ]);
  });

  it("rebuilds a selected-canvas report from stored entity ids", () => {
    const { input } = resolveReportSource(
      {
        ...base,
        origin: "canvas",
        canvasId: "cv",
        selection: "selected",
        entityIds: ["a", "c"],
      },
      deps,
    );
    expect(input?.entities.map((x) => x.id)).toEqual(["a", "c"]);
    expect(input?.relationships).toEqual([]);
  });

  it("rebuilds graph and table reports from entity ids and connections", () => {
    for (const origin of ["graph", "table"] as const) {
      const { input } = resolveReportSource(
        { ...base, origin, entityIds: ["a", "b"] },
        deps,
      );
      expect(input?.relationships).toEqual([
        { sourceId: "a", targetId: "b", label: "friend" },
      ]);
    }
  });

  it("reports source-missing for a deleted canvas or vanished entities", () => {
    expect(
      resolveReportSource(
        { ...base, origin: "canvas", canvasId: "gone", selection: "entire" },
        deps,
      ).error,
    ).toBe("source-missing");
    expect(
      resolveReportSource({ ...base, origin: "graph", entityIds: ["x"] }, deps)
        .error,
    ).toBe("source-missing");
  });

  it("skips deleted entities and keeps the rest", () => {
    const { input } = resolveReportSource(
      { ...base, origin: "table", entityIds: ["a", "x"] },
      deps,
    );
    expect(input?.entities.map((x) => x.id)).toEqual(["a"]);
  });
});
