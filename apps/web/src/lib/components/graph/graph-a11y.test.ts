import { describe, expect, it } from "vitest";
import { buildGraphSummary, buildSelectionAnnouncement } from "./graph-a11y";

const summaryInput = (overrides = {}) => ({
  totalEntities: 12,
  totalConnections: 20,
  renderedEntities: 12,
  focusViewActive: false,
  filtersActive: false,
  ...overrides,
});

describe("buildGraphSummary", () => {
  it("states the vault's scale and points at the operable alternatives", () => {
    const lines = buildGraphSummary(summaryInput());

    expect(lines[0]).toContain("12 entities");
    expect(lines[0]).toContain("20 connections");
    expect(lines.at(-1)).toContain("Browse as table");
    expect(lines.at(-1)).toContain("Control K");
  });

  it("explains focus-view culling and how to leave it", () => {
    const lines = buildGraphSummary(
      summaryInput({
        totalEntities: 1600,
        renderedEntities: 40,
        focusViewActive: true,
      }),
    );

    expect(lines[1]).toContain("only 40 of the 1600 entities are drawn");
    expect(lines[1]).toContain("Show full graph");
  });

  it("explains filter culling separately from focus view", () => {
    const lines = buildGraphSummary(
      summaryInput({ renderedEntities: 3, filtersActive: true }),
    );

    expect(lines[1]).toContain("Filters are active");
    expect(lines[1]).toContain("3 of the 12 entities");
  });

  it("does not claim entities are hidden when everything is drawn", () => {
    const lines = buildGraphSummary(
      summaryInput({ focusViewActive: true, filtersActive: true }),
    );

    expect(lines).toHaveLength(2);
    expect(lines[1]).not.toContain("are drawn");
  });

  it("gives an empty graph its own guidance instead of a zero count", () => {
    const lines = buildGraphSummary(
      summaryInput({
        totalEntities: 0,
        totalConnections: 0,
        renderedEntities: 0,
      }),
    );

    expect(lines).toEqual([
      "This graph is empty. Create an entity to begin, then connect it to another to draw your first relationship.",
    ]);
  });

  it("uses singular wording for a one-entity graph", () => {
    const lines = buildGraphSummary(
      summaryInput({
        totalEntities: 1,
        totalConnections: 1,
        renderedEntities: 1,
      }),
    );

    expect(lines[0]).toContain("1 entity and 1 connection.");
  });
});

describe("buildSelectionAnnouncement", () => {
  it("names the entity, its type, and its connection count", () => {
    expect(
      buildSelectionAnnouncement(
        { title: "Eldrin the Wise", type: "character" },
        5,
      ),
    ).toBe("Selected Eldrin the Wise, character, 5 connections.");
  });

  it("stays silent when nothing is selected", () => {
    expect(buildSelectionAnnouncement(null, 0)).toBe("");
    expect(buildSelectionAnnouncement({ title: "" }, 0)).toBe("");
  });

  it("omits a missing type rather than announcing undefined", () => {
    expect(buildSelectionAnnouncement({ title: "Unsorted" }, 1)).toBe(
      "Selected Unsorted, 1 connection.",
    );
  });
});
