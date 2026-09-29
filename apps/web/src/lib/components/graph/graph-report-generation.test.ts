import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import { useGraphReportGeneration } from "./graph-report-generation";
import { useTableReportGeneration } from "../table/table-report-generation";

const e = (id: string, target?: string, type = "friend"): Entity =>
  ({
    id,
    type: "character",
    title: id,
    labels: [],
    aliases: [],
    content: "",
    status: "active",
    connections: target ? [{ target, type }] : [],
  }) as unknown as Entity;

const store: Record<string, Entity> = {
  a: e("a", "b"),
  b: e("b"),
  c: e("c"),
  d: e("d", "a", "enemy"),
};
const get = (id: string) => store[id];

describe.each([
  ["graph", useGraphReportGeneration],
  ["table", useTableReportGeneration],
])("%s report generation", (origin, run) => {
  it("keeps only selected entities and relationships inside the selection", () => {
    const res = run(["a", "b", "c"], get);
    expect(res.source).toEqual({ origin, entityIds: ["a", "b", "c"] });
    expect(res.input?.entities.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(res.input?.relationships).toEqual([
      { sourceId: "a", targetId: "b", label: "friend" },
    ]);
  });

  it("drops relationships to entities outside the selection", () => {
    const res = run(["a", "d"], get);
    expect(res.input?.relationships).toEqual([
      { sourceId: "d", targetId: "a", label: "enemy" },
    ]);
    expect(run(["a"], get).input?.relationships).toEqual([]);
  });

  it("returns no-selection for an empty or unknown selection", () => {
    expect(run([], get).error).toBe("no-selection");
    expect(run(["zzz"], get).input).toBeNull();
  });
});
