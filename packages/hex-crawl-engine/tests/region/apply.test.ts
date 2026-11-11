import { describe, expect, it } from "bun:test";
import {
  applyRegionProposal,
  normalizeHexCrawlState,
  parseHexKey,
  undoRegion,
  type HexCrawlState,
  type RegionProposal,
} from "../../src";
import { NOW, run, stateWith } from "./fixtures";

const accept = (
  state: HexCrawlState,
  proposal: RegionProposal,
  adjust = {},
  now = NOW + 10,
) => applyRegionProposal(state, proposal, adjust, now);

describe("applyRegionProposal: area", () => {
  it("writes ordinary preset terrain with provenance and the new stamp", () => {
    const state = stateWith();
    const proposal = run(state, "APPLY-1", { radius: 2 });
    const out = accept(state, proposal);
    expect(out.applied).toHaveLength(19);
    expect(out.skipped).toEqual([]);
    for (const [key, id] of Object.entries(proposal.hexes)) {
      expect(out.state.hexes[key]).toEqual({
        terrain: { kind: "preset", id },
        generated: { seed: "APPLY-1", rules: 1 },
        updatedAt: NOW + 10,
      });
    }
  });

  it("carries notes, AI notes, Explored state and drafts over unchanged (FR-017)", () => {
    const state = stateWith(
      {},
      {
        "1,0": {
          notes: "n",
          aiNotes: "a",
          explored: true,
          exploredAt: 9,
          updatedAt: 3,
        },
        "0,1": { notes: "only" },
      },
    );
    const out = accept(state, run(state, "APPLY-2", { radius: 2 }));
    expect(out.state.hexes["1,0"]).toMatchObject({
      notes: "n",
      aiNotes: "a",
      explored: true,
      exploredAt: 9,
    });
    expect(out.state.hexes["0,1"]?.notes).toBe("only");
    expect(out.state.hexes["1,0"].terrain).toBeDefined();
  });

  it("skips a hex that gained terrain since the proposal and reports it (FR-027)", () => {
    const state = stateWith();
    const proposal = run(state, "APPLY-3", { radius: 2 });
    const changed = stateWith({ "1,0": "water" });
    const out = accept(changed, proposal);
    expect(out.skipped).toEqual(["1,0"]);
    expect(out.state.hexes["1,0"].terrain).toEqual({
      kind: "preset",
      id: "water",
    });
    expect(out.state.hexes["1,0"].generated).toBeUndefined();
    expect(out.applied).toHaveLength(18);
  });

  it("creates no record for hexes outside the proposal (FR-032)", () => {
    const state = stateWith();
    const out = accept(state, run(state, "APPLY-4", { radius: 1 }));
    expect(Object.keys(out.state.hexes)).toHaveLength(7);
  });

  it("does not mutate its input and returns undo data covering exactly the applied hexes", () => {
    const state = stateWith({}, { "1,0": { notes: "n", updatedAt: 2 } });
    const before = structuredClone(state);
    const out = accept(state, run(state, "APPLY-5", { radius: 1 }));
    expect(state).toEqual(before);
    expect(Object.keys(out.undo.before).sort()).toEqual(
      [...out.applied].sort(),
    );
    expect(out.undo.before["1,0"]).toEqual(before.hexes["1,0"]);
    expect(out.undo.before["0,0"]).toBeNull();
    for (const key of out.applied) expect(out.undo.stamps[key]).toBe(NOW + 10);
  });

  it("saves an adjusted hex as the GM's choice, hand-set (FR-022)", () => {
    const state = stateWith();
    const proposal = run(state, "APPLY-6", { radius: 1 });
    const out = accept(state, proposal, {
      "0,0": { kind: "custom", label: "Glass dunes" },
    });
    expect(out.state.hexes["0,0"].terrain).toEqual({
      kind: "custom",
      label: "Glass dunes",
    });
    expect(out.state.hexes["0,0"].generated).toBeUndefined();
    expect(out.state.hexes["1,0"].generated).toBeDefined();
  });
});

describe("applyRegionProposal: regenerate", () => {
  const base = () => {
    const first = run(stateWith(), "REGEN-A", { radius: 2 });
    return accept(stateWith(), first, {}, NOW).state;
  };

  it("replaces generated terrain only, keeping everything else on the hex (FR-017, FR-019)", () => {
    const state = base();
    state.hexes["0,0"] = {
      ...state.hexes["0,0"],
      explored: true,
      exploredAt: 4,
      notes: "keep",
      draft: undefined,
    };
    const proposal = run(state, "REGEN-B", {
      operation: "regenerate",
      radius: 2,
    });
    const out = accept(state, proposal, {}, NOW + 20);
    expect(out.state.hexes["0,0"]).toMatchObject({
      explored: true,
      exploredAt: 4,
      notes: "keep",
    });
    expect(out.state.hexes["0,0"].generated).toEqual({
      seed: "REGEN-B",
      rules: 1,
    });
  });

  it("skips a hex that was edited, or has been written to, since the proposal (FR-027)", () => {
    const state = base();
    const proposal = run(state, "REGEN-C", {
      operation: "regenerate",
      radius: 2,
    });
    const edited = structuredClone(state);
    edited.hexes["0,0"] = {
      terrain: { kind: "preset", id: "hills" },
      updatedAt: NOW + 5,
    }; // hand-set now
    edited.hexes["1,0"] = { ...edited.hexes["1,0"], updatedAt: NOW + 6 }; // touched since
    const out = accept(edited, proposal, {}, NOW + 20);
    expect(out.skipped.sort()).toEqual(["0,0", "1,0"]);
    expect(out.state.hexes["0,0"].terrain).toEqual({
      kind: "preset",
      id: "hills",
    });
  });
});

describe("undoRegion", () => {
  it("restores every hex exactly, removing records that did not exist (FR-028a)", () => {
    const start = stateWith({}, { "1,0": { notes: "n", updatedAt: 2 } });
    const out = accept(start, run(start, "UNDO-1", { radius: 1 }));
    const restored = undoRegion(out.state, out.undo);
    expect(restored).toEqual(start);
  });

  it("restores terrain that a regeneration replaced", () => {
    const first = accept(
      stateWith(),
      run(stateWith(), "UNDO-2", { radius: 2 }),
      {},
      NOW,
    );
    const proposal = run(first.state, "UNDO-3", {
      operation: "regenerate",
      radius: 2,
    });
    const second = accept(first.state, proposal, {}, NOW + 20);
    expect(undoRegion(second.state, second.undo)).toEqual(first.state);
  });

  it("refuses, changing nothing, when any hex has been written to since (FR-028b)", () => {
    const out = accept(stateWith(), run(stateWith(), "UNDO-4", { radius: 1 }));
    const later = structuredClone(out.state);
    later.hexes["0,0"].updatedAt = NOW + 99;
    expect(undoRegion(later, out.undo)).toBeNull();
    expect(later.hexes["0,0"].updatedAt).toBe(NOW + 99);
  });
});

describe("persistence round trip (FR-031, SC-007)", () => {
  it("keeps terrain and provenance through JSON and normalisation, and stays regenerable", () => {
    const state = stateWith();
    const out = accept(state, run(state, "TRIP-1", { radius: 2 }));
    const stored = JSON.parse(JSON.stringify(out.state));
    const back = normalizeHexCrawlState(stored);
    expect(back.hexes).toEqual(out.state.hexes);
    for (const key of Object.keys(back.hexes))
      expect(parseHexKey(key)).not.toBeNull();
    const again = run(back, "TRIP-2", { operation: "regenerate", radius: 2 });
    expect(Object.keys(again.hexes)).toHaveLength(19);
  });
});
