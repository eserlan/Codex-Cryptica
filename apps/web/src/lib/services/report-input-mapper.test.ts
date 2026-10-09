import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import {
  assembleReportInput,
  buildFactionMembership,
  buildRelationshipInputs,
  connectionPairs,
  toReportEntityInput,
} from "./report-input-mapper";

const make = (over: Partial<Entity> & { id: string }): Entity =>
  ({
    type: "character",
    title: over.id,
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    status: "active",
    ...over,
  }) as Entity;

describe("toReportEntityInput", () => {
  it("splits content at the first heading into description and notes", () => {
    const input = toReportEntityInput(
      make({
        id: "a",
        content: "A rogue.\nSecond line.\n\n## History\nBorn in Vaeloth.",
        lore: " GM secret ",
        image: "a.png",
      }),
    );
    expect(input.description).toBe("A rogue.\nSecond line.");
    expect(input.summary).toBe("A rogue. Second line.");
    expect(input.notes).toBe("## History\nBorn in Vaeloth.");
    expect(input.secrets).toBe("GM secret");
    expect(input.portraitUrl).toBe("a.png");
  });

  it("leaves description empty when content starts with a heading", () => {
    const input = toReportEntityInput(make({ id: "a", content: "## Only\nx" }));
    expect(input.description).toBeUndefined();
    expect(input.notes).toBe("## Only\nx");
    expect(input.summary).toBe("x");
  });

  it("has no summary when a heading-only note has no body text", () => {
    const input = toReportEntityInput(make({ id: "a", content: "## Only" }));
    expect(input.summary).toBeUndefined();
  });
});

describe("buildRelationshipInputs", () => {
  it("drops relationships to out-of-scope entities", () => {
    const rels = buildRelationshipInputs(
      ["a", "b"],
      [
        { sourceId: "a", targetId: "b", label: "friend" },
        { sourceId: "a", targetId: "z", label: "enemy" },
      ],
    );
    expect(rels).toEqual([{ sourceId: "a", targetId: "b", label: "friend" }]);
  });

  it("dedupes and defaults the label", () => {
    const rels = buildRelationshipInputs(
      ["a", "b"],
      [
        { sourceId: "a", targetId: "b" },
        { sourceId: "a", targetId: "b" },
      ],
    );
    expect(rels).toEqual([{ sourceId: "a", targetId: "b", label: "related" }]);
  });
});

describe("buildFactionMembership", () => {
  const entities = [
    { id: "f", title: "F", type: "faction", labels: [] },
    { id: "g", title: "G", type: "faction", labels: [] },
    { id: "c", title: "C", type: "character", labels: [] },
  ];

  it("counts a relationship in either direction as membership", () => {
    expect(
      buildFactionMembership(entities, [
        { sourceId: "c", targetId: "f", label: "serves" },
      ]).f,
    ).toEqual(["c"]);
    expect(
      buildFactionMembership(entities, [
        { sourceId: "f", targetId: "c", label: "employs" },
      ]).f,
    ).toEqual(["c"]);
  });

  it("does not treat faction-to-faction as membership", () => {
    const m = buildFactionMembership(entities, [
      { sourceId: "f", targetId: "g", label: "rival" },
    ]);
    expect(m.f).toEqual([]);
    expect(m.g).toEqual([]);
  });

  it("never includes out-of-scope members", () => {
    const rels = buildRelationshipInputs(
      ["f"],
      [{ sourceId: "c", targetId: "f", label: "serves" }],
    );
    expect(buildFactionMembership([entities[0]], rels).f).toEqual([]);
  });
});

describe("assembleReportInput", () => {
  it("builds a 500-entity input from connections quickly", () => {
    const entities = Array.from({ length: 500 }, (_, i) =>
      make({
        id: `e${i}`,
        connections: [{ target: `e${(i + 1) % 500}`, type: "friend" } as any],
      }),
    );
    const start = performance.now();
    const input = assembleReportInput(entities, connectionPairs(entities));
    expect(performance.now() - start).toBeLessThan(500);
    expect(input.entities).toHaveLength(500);
    expect(input.relationships).toHaveLength(500);
  });
});

describe("buildRelationshipInputs sources", () => {
  it("keeps the same relationship once and remembers both sources", () => {
    const rels = buildRelationshipInputs(
      ["a", "b"],
      [
        { sourceId: "a", targetId: "b", label: "friend", source: "canvas" },
        { sourceId: "a", targetId: "b", label: "friend", source: "graph" },
        { sourceId: "a", targetId: "b", label: "friend", source: "graph" },
      ],
    );
    expect(rels).toEqual([
      {
        sourceId: "a",
        targetId: "b",
        label: "friend",
        sources: ["canvas", "graph"],
      },
    ]);
  });
});
