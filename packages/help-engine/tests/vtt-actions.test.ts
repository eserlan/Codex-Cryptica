import { describe, expect, it } from "vitest";
import {
  AVAILABLE_ACTION_IDS,
  CONTROL_CATALOGUE,
  CONTROL_IDS,
  FEATURE_REGISTRY,
  GuidanceActionSchema,
  PANEL_IDS,
  VTT_ACTION_IDS,
  VTT_CONTROL_IDS,
  VTT_PANEL_IDS,
  buildActionCandidates,
  parseHelpContext,
  sanitizeHelpContext,
  validateAction,
  withoutPanelFlags,
} from "../src";

const deps = { helpIds: new Set<string>(["vtt-session"]) };

const map = (flags: string[], availableActions: string[]) =>
  sanitizeHelpContext({
    routeTemplate: "/(app)/map",
    area: "map",
    flags,
    availableActions,
  });

const gridSettings = {
  type: "openPanel",
  panel: "vtt-grid-settings",
  label: "Open Grid Settings",
} as const;

const showAddToken = {
  type: "openPanel",
  panel: "vtt-sidebar",
  label: "Show me where to add a token",
  then: { type: "highlight", target: "vtt-add-token", label: "Add Token" },
} as const;

describe("VTT panels and controls are on the closed lists", () => {
  it("lists every VTT panel and control once, with a spec for each control", () => {
    for (const id of VTT_PANEL_IDS) expect(PANEL_IDS).toContain(id);
    for (const id of VTT_CONTROL_IDS) {
      expect(CONTROL_IDS).toContain(id);
      expect(CONTROL_CATALOGUE[id].area).toBe("map");
    }
    expect(new Set(VTT_ACTION_IDS).size).toBe(VTT_ACTION_IDS.length);
    for (const id of VTT_ACTION_IDS) expect(AVAILABLE_ACTION_IDS).toContain(id);
  });

  it("still rejects an action that is not on the lists", () => {
    expect(
      GuidanceActionSchema.safeParse({
        type: "openPanel",
        panel: "vtt-advance-initiative",
        label: "Next turn",
      }).success,
    ).toBe(false);
    expect(
      GuidanceActionSchema.safeParse({
        type: "highlight",
        target: "vtt-delete-snapshot",
        label: "Delete",
      }).success,
    ).toBe(false);
  });
});

describe("validating VTT guides", () => {
  it("accepts a panel the map says is reachable", () => {
    const ctx = map(["vtt-on"], ["vtt-grid-settings"]);

    expect(validateAction(gridSettings, ctx, deps)).toEqual(gridSettings);
  });

  it("refuses a panel the user cannot reach, such as a player's Grid Settings", () => {
    const player = map(["vtt-on", "vtt-guest"], ["vtt-sidebar"]);

    expect(validateAction(gridSettings, player, deps)).toBeNull();
  });

  it("refuses a VTT panel anywhere but the map", () => {
    const elsewhere = sanitizeHelpContext({
      routeTemplate: "/(app)/tables",
      area: "tables",
      availableActions: ["vtt-grid-settings"],
    });

    expect(validateAction(gridSettings, elsewhere, deps)).toBeNull();
  });

  it("offers open-then-point only for controls this user can reach", () => {
    const gm = map(["vtt-on"], ["vtt-sidebar", "vtt-add-token"]);
    const player = map(["vtt-on", "vtt-guest"], ["vtt-sidebar"]);

    expect(validateAction(showAddToken, gm, deps)).toEqual(showAddToken);
    // Opening the sidebar must not unlock a host control for a player.
    expect(validateAction(showAddToken, player, deps)).toBeNull();
  });

  it("needs the flag a control depends on", () => {
    const ctx = map([], ["vtt-initiative-panel"]);
    const show = {
      type: "highlight",
      target: "vtt-initiative-panel",
      label: "Show me the initiative list",
    } as const;

    expect(validateAction(show, ctx, deps)).toBeNull();
    expect(
      validateAction(
        show,
        map(["vtt-on", "vtt-combat"], ["vtt-initiative-panel"]),
        deps,
      ),
    ).toEqual(show);
  });

  it("offers the travel readout only when solo fog is enabled", () => {
    const showTravel = {
      type: "openPanel",
      panel: "vtt-map-controls",
      label: "Show me the travel readout",
      then: {
        type: "highlight",
        target: "vtt-travel-readout",
        label: "Travel readout",
      },
    } as const;
    expect(
      validateAction(
        showTravel,
        map(
          ["vtt-fog-on", "vtt-solo-fog"],
          ["vtt-map-controls", "vtt-travel-readout"],
        ),
        deps,
      ),
    ).toEqual(showTravel);
    expect(
      validateAction(
        showTravel,
        map([], ["vtt-map-controls", "vtt-travel-readout"]),
        deps,
      ),
    ).toBeNull();
    expect(
      validateAction(
        showTravel,
        map(
          ["vtt-fog-on", "vtt-solo-fog", "vtt-guest"],
          ["vtt-map-controls", "vtt-travel-readout"],
        ),
        deps,
      ),
    ).toBeNull();
  });
});

describe("the VTT actions in the registry", () => {
  const vtt = FEATURE_REGISTRY.find((feature) => feature.id === "vtt-map")!;
  const gm = map(["vtt-on", "vtt-combat", "vtt-solo-fog"], [...VTT_ACTION_IDS]);
  const player = map(
    ["vtt-on", "vtt-combat", "vtt-guest"],
    ["vtt-sidebar", "vtt-initiative-panel"],
  );

  it("are all valid guides, and none of them operates anything", () => {
    for (const ref of vtt.actions) {
      expect(GuidanceActionSchema.safeParse(ref.action).success).toBe(true);
      const steps = [ref.action, "then" in ref.action ? ref.action.then : null];
      for (const step of steps) {
        expect(
          step === null ||
            ["navigate", "openPanel", "highlight"].includes(step.type),
        ).toBe(true);
      }
    }
  });

  it("cover grid settings, initiative and encounters, and a multiplayer control", () => {
    const ids = vtt.actions.map((a) => a.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        "vtt.open-grid-settings",
        "vtt.show-initiative",
        "vtt.open-encounters",
        "vtt.show-share",
      ]),
    );
  });

  it("are offered to the GM in combat", () => {
    const offered = buildActionCandidates(vtt.actions, gm, deps).map(
      (c) => c.id,
    );

    expect(offered).toEqual(
      expect.arrayContaining([
        "vtt.open-grid-settings",
        "vtt.open-encounters",
        "vtt.show-initiative",
        "vtt.show-share",
        "vtt.show-fog",
        "vtt.show-travel-readout",
      ]),
    );
  });

  it("leave a player with only what a player can reach", () => {
    const offered = buildActionCandidates(vtt.actions, player, deps).map(
      (c) => c.id,
    );

    expect(offered).toEqual(["map.open", "vtt.show-initiative"]);
  });

  it("are all unavailable on a screen that is not the map", () => {
    const tables = sanitizeHelpContext({
      routeTemplate: "/(app)/tables",
      area: "tables",
      availableActions: [...VTT_ACTION_IDS],
    });

    const offered = buildActionCandidates(vtt.actions, tables, deps).map(
      (c) => c.id,
    );

    expect(offered.filter((id) => id.startsWith("vtt."))).toEqual([]);
  });

  it("link their workflows only to actions that exist", () => {
    const ids = new Set(vtt.actions.map((a) => a.id));
    for (const workflow of vtt.workflows) {
      for (const id of workflow.actionIds) expect(ids.has(id)).toBe(true);
    }
  });
});

describe("the screen description with VTT actions", () => {
  it("fits every panel and control at once", () => {
    const ctx = map(
      ["vtt-on"],
      [
        ...VTT_ACTION_IDS,
        "settings-vault",
        "settings-theme",
        "session-journal",
      ],
    );

    expect(parseHelpContext(ctx).ok).toBe(true);
    expect(ctx.availableActions.length).toBeGreaterThan(16);
  });

  it("retries against an older service without the VTT panels and controls", () => {
    const ctx = map(
      ["vtt-on"],
      ["vtt-sidebar", "vtt-fog-toggle", "settings-vault"],
    );

    expect(withoutPanelFlags(ctx).availableActions).toEqual(["settings-vault"]);
  });
});
