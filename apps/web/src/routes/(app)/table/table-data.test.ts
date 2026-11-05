import { describe, expect, it } from "vitest";
import { EntitySchema, type Entity } from "schema";
import {
  computeConnectionCounts,
  countIncompleteEntities,
} from "./table-data.js";

describe("table data", () => {
  it("counts inbound and valid outbound connections separately", () => {
    const entities = [
      { id: "a", connections: [{ target: "b" }, { target: "" }] },
      { id: "b" },
    ] as Entity[];
    expect(computeConnectionCounts(entities, { a: [{ source: "b" }] })).toEqual(
      {
        a: { inbound: 1, outbound: 1, total: 2 },
        b: { inbound: 0, outbound: 0, total: 0 },
      },
    );
    expect(computeConnectionCounts([])).toEqual({});
  });

  it("counts incomplete entities including drafts without conflating image and completeness", () => {
    const entities = [
      EntitySchema.parse({
        id: "a",
        title: "Complete",
        type: "character",
        content: "Description",
        labels: ["hero"],
      }),
      EntitySchema.parse({
        id: "b",
        title: "Draft",
        type: "character",
        content: "",
        labels: [],
        status: "draft",
      }),
    ] as Entity[];
    const counts = computeConnectionCounts(entities, { a: [{}] });
    expect(countIncompleteEntities(entities, counts)).toBe(1);
    expect(countIncompleteEntities(entities, {})).toBe(2);
    expect(countIncompleteEntities([], {})).toBe(0);
  });
});
