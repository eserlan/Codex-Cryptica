import { describe, expect, it } from "vitest";
import { VTT_ACTION_IDS } from "help-engine";
import { reachableVttActions } from "./vtt-help-actions";

const gm = { guest: false, gm: true, vttOn: true, combat: true };

describe("reachableVttActions", () => {
  it("only ever names panels and controls the engine knows", () => {
    for (const id of reachableVttActions(gm)) {
      expect(VTT_ACTION_IDS).toContain(id);
    }
  });

  it("offers a GM in combat everything", () => {
    expect(reachableVttActions(gm).sort()).toEqual([...VTT_ACTION_IDS].sort());
  });

  it("leaves a player the sidebar and the initiative list only", () => {
    expect(reachableVttActions({ ...gm, guest: true, gm: false })).toEqual([
      "vtt-sidebar",
      "vtt-initiative-panel",
    ]);
  });

  it("drops the GM controls in Player View but keeps the host's", () => {
    const ids = reachableVttActions({ ...gm, gm: false });

    expect(ids).not.toContain("vtt-grid-settings");
    expect(ids).not.toContain("vtt-fog-toggle");
    expect(ids).toContain("vtt-encounters");
    expect(ids).toContain("vtt-player-view-toggle");
  });

  it("waits for VTT mode, and for Combat for the initiative list", () => {
    const off = reachableVttActions({ ...gm, vttOn: false });
    expect(off).not.toContain("vtt-sidebar");
    expect(off).not.toContain("vtt-add-token");
    expect(off).toContain("vtt-grid-settings");

    expect(reachableVttActions({ ...gm, combat: false })).not.toContain(
      "vtt-initiative-panel",
    );
  });
});
