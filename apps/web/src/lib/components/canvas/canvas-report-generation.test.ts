import { describe, expect, it } from "vitest";
import type { Node, Edge } from "@xyflow/svelte";
import type { Canvas } from "@codex/canvas-engine";
import type { Entity } from "schema";
import { useCanvasReportGeneration } from "./canvas-report-generation";

const entity = (id: string, over: Partial<Entity> = {}): Entity =>
  ({
    id,
    type: "character",
    title: id.toUpperCase(),
    labels: [],
    aliases: [],
    connections: [{ target: "c", type: "vault-wide" }],
    content: "",
    status: "active",
    ...over,
  }) as Entity;

const store: Record<string, Entity> = {
  a: entity("a"),
  b: entity("b"),
  c: entity("c"),
};
const getEntity = (id: string) => store[id];

const node = (id: string, entityId: string, selected = false): Node => ({
  id,
  type: "entity",
  position: { x: 0, y: 0 },
  data: { entityId },
  selected,
});
const edge = (
  id: string,
  source: string,
  target: string,
  label?: string,
): Edge => ({
  id,
  source,
  target,
  label,
});
const canvas = (over: Partial<Canvas> = {}): Canvas =>
  ({ id: "cv", name: "Party", nodes: [], edges: [], ...over }) as Canvas;

describe("useCanvasReportGeneration", () => {
  it("reads relationships from canvas edges", () => {
    const res = useCanvasReportGeneration(
      canvas(),
      [node("n1", "a"), node("n2", "b")],
      [edge("e1", "n1", "n2", "friend")],
      "entire",
      getEntity,
    );
    expect(res.source).toEqual({
      origin: "canvas",
      canvasId: "cv",
      selection: "entire",
    });
    expect(res.input?.relationships).toEqual([
      { sourceId: "a", targetId: "b", label: "friend", sources: ["canvas"] },
    ]);
  });

  it("also includes the connections entities have in the graph", () => {
    const linked: Record<string, Entity> = {
      a: entity("a", {
        connections: [{ target: "b", type: "ally", strength: 1 }],
      }),
      b: entity("b", { connections: [] }),
    };
    const res = useCanvasReportGeneration(
      canvas(),
      [node("n1", "a"), node("n2", "b")],
      [],
      "entire",
      (id) => linked[id],
    );
    expect(res.input?.relationships).toEqual([
      { sourceId: "a", targetId: "b", label: "ally", sources: ["graph"] },
    ]);
  });

  it("combines both sources without repeating the same relationship", () => {
    const linked: Record<string, Entity> = {
      a: entity("a", {
        connections: [
          { target: "b", type: "friend", strength: 1 },
          { target: "c", type: "rival", strength: 1 },
        ],
      }),
      b: entity("b", { connections: [] }),
      c: entity("c", { connections: [] }),
    };
    const res = useCanvasReportGeneration(
      canvas(),
      [node("n1", "a"), node("n2", "b"), node("n3", "c")],
      [edge("e1", "n1", "n2", "friend"), edge("e2", "n2", "n3", "owes")],
      "entire",
      (id) => linked[id],
    );
    expect(res.input?.relationships).toEqual([
      {
        sourceId: "a",
        targetId: "b",
        label: "friend",
        sources: ["canvas", "graph"],
      },
      { sourceId: "b", targetId: "c", label: "owes", sources: ["canvas"] },
      { sourceId: "a", targetId: "c", label: "rival", sources: ["graph"] },
    ]);
  });

  it("leaves out a connection to an entity that is not in scope", () => {
    const res = useCanvasReportGeneration(
      canvas(),
      [node("n1", "a"), node("n2", "b", true)],
      [],
      "selected",
      (id) =>
        ({
          a: entity("a", {
            connections: [{ target: "b", type: "x", strength: 1 }],
          }),
          b: entity("b", { connections: [] }),
        })[id as "a" | "b"],
    );
    expect(res.input?.relationships).toEqual([]);
  });

  it("excludes non-entity nodes", () => {
    const res = useCanvasReportGeneration(
      canvas(),
      [
        node("n1", "a"),
        { id: "t", type: "text", position: { x: 0, y: 0 }, data: {} },
      ],
      [],
      "entire",
      getEntity,
    );
    expect(res.input?.entities.map((e) => e.id)).toEqual(["a"]);
  });

  it("rejects adventure canvases", () => {
    const res = useCanvasReportGeneration(
      canvas({ metadata: { kind: "adventure" } } as any),
      [node("n1", "a")],
      [],
      "entire",
      getEntity,
    );
    expect(res.input).toBeNull();
    expect(res.error).toBe("unsupported-canvas");
  });

  it("reports no entities for an empty canvas", () => {
    const res = useCanvasReportGeneration(
      canvas(),
      [],
      [],
      "entire",
      getEntity,
    );
    expect(res.input).toBeNull();
    expect(res.error).toBe("no-entities");
  });

  it("selected scope keeps only selected nodes and drops edges to unselected ones", () => {
    const res = useCanvasReportGeneration(
      canvas(),
      [node("n1", "a", true), node("n2", "b", true), node("n3", "c", false)],
      [edge("e1", "n1", "n2", "friend"), edge("e2", "n1", "n3", "enemy")],
      "selected",
      getEntity,
    );
    expect(res.source.entityIds).toEqual(["a", "b"]);
    expect(res.input?.entities.map((e) => e.id)).toEqual(["a", "b"]);
    expect(res.input?.relationships).toHaveLength(1);
  });

  it("selected scope with nothing selected returns no-selection", () => {
    const res = useCanvasReportGeneration(
      canvas(),
      [node("n1", "a")],
      [],
      "selected",
      getEntity,
    );
    expect(res.input).toBeNull();
    expect(res.error).toBe("no-selection");
  });
});
