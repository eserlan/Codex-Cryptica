import { describe, expect, it } from "bun:test";
import { JOURNEYS, journeyForGoal } from "../src/journeys";
import { applyMilestone, currentStep, startJourney } from "../src/progress";
import { JourneyDefinitionSchema } from "../src/schema";
import type { JourneyDefinition, Milestone } from "../src/types";
import { connected, created, defaults, graph } from "./fixtures";

const run = (def: JourneyDefinition, ...ms: Milestone[]) =>
  ms.reduce(
    (p, m) => applyMilestone(p, def, m, defaults),
    startJourney(def, 100),
  );
const saved = (at = 200): Milestone => ({ kind: "generator-saved", at });
const found = (at = 200): Milestone => ({ kind: "entry-found", at });

describe("JOURNEYS", () => {
  it("every journey passes the schema", () => {
    for (const def of Object.values(JOURNEYS)) {
      const r = JourneyDefinitionSchema.safeParse(def);
      expect(r.error?.issues ?? []).toEqual([]);
    }
  });

  it("maps each goal to its journey", () => {
    expect(journeyForGoal("world").id).toBe("worldbuilder");
    expect(journeyForGoal("story").id).toBe("writer");
    expect(journeyForGoal("campaign").id).toBe("rpg-gm");
  });

  it("matches the data-model step table", () => {
    const shape = (def: JourneyDefinition) =>
      def.steps.map((s) => [s.id, s.completeOn, s.after ?? []]);
    expect(shape(JOURNEYS.worldbuilder)).toEqual([
      ["add-place", { kind: "entry-created", categories: ["location"] }, []],
      [
        "add-character",
        { kind: "entry-created", categories: ["character"] },
        [],
      ],
      ["connect", { kind: "connection-added" }, []],
      [
        "see-graph",
        { kind: "screen", area: "graph" },
        ["add-place", "add-character", "connect"],
      ],
    ]);
    expect(shape(JOURNEYS.writer)).toEqual([
      [
        "add-character",
        { kind: "entry-created", categories: ["character"] },
        [],
      ],
      [
        "add-place-or-note",
        { kind: "entry-created", categories: ["location", "note"] },
        [],
      ],
      ["connect", { kind: "connection-added" }, []],
      [
        "find-again",
        { kind: "entry-found" },
        ["add-character", "add-place-or-note"],
      ],
    ]);
    expect(shape(JOURNEYS["rpg-gm"])).toEqual([
      ["generate", { kind: "generator-saved" }, []],
      [
        "add-related",
        { kind: "entry-created", categories: ["character", "location"] },
        ["generate"],
      ],
    ]);
  });

  it("never names Cif as the source of content", () => {
    for (const def of Object.values(JOURNEYS)) {
      const copy = JSON.stringify(def);
      expect(copy).not.toMatch(/Cif (will )?(write|make|create|generate)/i);
    }
  });
});

describe("Worldbuilder", () => {
  const def = JOURNEYS.worldbuilder;

  it("finishes after a place, a character, a connection and the Graph", () => {
    const p = run(
      def,
      graph(),
      created("location"),
      created("character"),
      connected(),
      graph(),
    );
    expect(p.outcome).toBe("finished");
  });

  it("does not finish just because the Graph is already showing", () => {
    expect(run(def, graph()).completed).toEqual([]);
  });

  it("counts a character added first and keeps asking for the place", () => {
    const p = run(def, created("character"));
    expect(p.completed).toEqual(["add-character"]);
    expect(currentStep(p, def)?.id).toBe("add-place");
    expect(
      currentStep(run(def, created("character"), created("location")), def)?.id,
    ).toBe("connect");
  });
});

describe("Writer", () => {
  const def = JOURNEYS.writer;

  it("finishes with a note in place of a location", () => {
    const p = run(
      def,
      created("character"),
      created("note"),
      connected(),
      found(),
    );
    expect(p.outcome).toBe("finished");
  });

  it("does not count finding an entry before both entries exist", () => {
    expect(run(def, found()).completed).toEqual([]);
  });
});

describe("RPG GM", () => {
  const def = JOURNEYS["rpg-gm"];

  it("never finishes on a single save", () => {
    // One generator save reports the new entry first, then the save.
    const p = run(def, created("character"), saved());
    expect(p.outcome).toBe("running");
    expect(p.completed).toEqual(["generate"]);
  });

  it("finishes on a second, separate entry", () => {
    const p = run(def, created("character"), saved(), created("location", 300));
    expect(p.outcome).toBe("finished");
  });
});

describe("existing entries", () => {
  it("never count towards a journey", () => {
    for (const def of Object.values(JOURNEYS)) {
      const p = run(
        def,
        created("character", 50),
        created("location", 50),
        connected(50),
      );
      expect(p.completed).toEqual([]);
    }
  });
});
