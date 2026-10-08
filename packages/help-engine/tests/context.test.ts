import { describe, expect, it } from "vitest";
import { validateAction } from "../src/actions/validate";
import {
  HELP_CONTEXT_KEYS,
  HelpContextSchema,
  emptyHelpContext,
  parseHelpContext,
  sanitizeHelpContext,
} from "../src/context";

const settlementConnections = {
  v: 1,
  routeTemplate: "/(app)",
  area: "entity-detail",
  entityKind: "location",
  tab: "connections",
  mode: "view",
  surface: "vault",
  flags: [],
  availableActions: ["status-tab", "connections-tab"],
};

describe("HelpContextV1", () => {
  it("accepts the Settlement → Connections screen description", () => {
    const parsed = parseHelpContext(settlementConnections);
    expect(parsed.ok).toBe(true);
  });

  it("rejects an unknown key instead of silently accepting it", () => {
    expect(
      parseHelpContext({ ...settlementConnections, entityTitle: "Oakvale" }).ok,
    ).toBe(false);
  });

  it("rejects a resolved path that could carry an identifier", () => {
    expect(
      parseHelpContext({
        ...settlementConnections,
        routeTemplate:
          "/vault/3f2a9c1e-7b1d-4f6a-9c3e-0a1b2c3d4e5f/entity/9b1c",
      }).ok,
    ).toBe(false);
  });

  it("rejects off-list surfaces, areas and action IDs", () => {
    expect(
      parseHelpContext({ ...settlementConnections, surface: "admin" }).ok,
    ).toBe(false);
    expect(
      parseHelpContext({ ...settlementConnections, area: "secret" }).ok,
    ).toBe(false);
    expect(
      parseHelpContext({
        ...settlementConnections,
        availableActions: ["delete-vault"],
      }).ok,
    ).toBe(false);
  });

  it("pins the exact key set so additions are a reviewed change", () => {
    expect(HELP_CONTEXT_KEYS).toEqual(
      [
        "area",
        "availableActions",
        "entityKind",
        "flags",
        "mode",
        "routeTemplate",
        "surface",
        "tab",
        "v",
      ].sort(),
    );
  });
});

describe("HelpContextV1 — canvas, map, import and Settings", () => {
  const base = {
    v: 1,
    routeTemplate: "/(app)",
    area: "settings",
    entityKind: null,
    tab: "vault",
    mode: "view",
    surface: "vault",
    flags: [],
    availableActions: [],
  };

  it("accepts the new screens", () => {
    for (const [routeTemplate, area] of [
      ["/(app)/canvas", "canvas"],
      ["/(app)/map", "map"],
      ["/(app)/import", "import"],
    ] as const) {
      expect(
        parseHelpContext({ ...base, routeTemplate, area, tab: null }).ok,
      ).toBe(true);
    }
  });

  it("accepts a Settings screen and names its tab with the existing tab field", () => {
    for (const tab of [
      "vault",
      "intelligence",
      "schema",
      "templates",
      "theme",
      "publishing",
      "about",
      "help",
    ]) {
      expect(parseHelpContext({ ...base, tab }).ok, tab).toBe(true);
    }
  });

  it("rejects a tab that does not belong to the screen's area", () => {
    expect(
      parseHelpContext({ ...base, area: "settings", tab: "connections" }).ok,
    ).toBe(false);
    expect(
      parseHelpContext({ ...base, area: "entity-detail", tab: "vault" }).ok,
    ).toBe(false);
    expect(
      parseHelpContext({ ...base, area: "canvas", tab: "status" }).ok,
    ).toBe(false);
  });

  it("keeps the entity tabs working on an entity screen", () => {
    expect(
      parseHelpContext({ ...base, area: "entity-detail", tab: "lore" }).ok,
    ).toBe(true);
  });

  it("does not add a key: Settings reuses the tab field", () => {
    expect(Object.keys(HelpContextSchema.shape).sort()).toEqual(
      HELP_CONTEXT_KEYS,
    );
    expect(HELP_CONTEXT_KEYS).not.toContain("settingsTab");
  });
});

describe("sanitizeHelpContext", () => {
  it("drops a tab that does not fit the area instead of sending it", () => {
    expect(
      sanitizeHelpContext({ area: "settings", tab: "connections" }).tab,
    ).toBeNull();
    expect(
      sanitizeHelpContext({ area: "graph", tab: "status" }).tab,
    ).toBeNull();
    expect(
      sanitizeHelpContext({ area: "settings", tab: "publishing" }).tab,
    ).toBe("publishing");
    expect(
      sanitizeHelpContext({ area: "entity-detail", tab: "stats" }).tab,
    ).toBe("stats");
  });

  it("recognises the new areas", () => {
    for (const area of ["canvas", "map", "import", "settings"]) {
      expect(sanitizeHelpContext({ area }).area).toBe(area);
    }
  });

  it("collapses a user-defined category to custom", () => {
    expect(
      sanitizeHelpContext({
        ...settlementConnections,
        entityKind: "Settlement",
      }).entityKind,
    ).toBe("custom");
  });

  it("keeps a built-in category and a null category", () => {
    expect(sanitizeHelpContext(settlementConnections).entityKind).toBe(
      "location",
    );
    expect(
      sanitizeHelpContext({ ...settlementConnections, entityKind: null })
        .entityKind,
    ).toBeNull();
  });

  it("drops extra keys, unknown flags and unknown actions, and maps an unknown route", () => {
    const out = sanitizeHelpContext({
      ...settlementConnections,
      routeTemplate: "/vault/abc123",
      entityId: "9b1c",
      entityTitle: "Oakvale",
      flags: ["generators", "nope"],
      availableActions: ["status-tab", "nope"],
    });
    expect(out.routeTemplate).toBe("unknown");
    expect(out.flags).toEqual(["generators"]);
    expect(out.availableActions).toEqual(["status-tab"]);
    expect(Object.keys(out).sort()).toEqual(HELP_CONTEXT_KEYS);
    expect(parseHelpContext(out).ok).toBe(true);
  });

  it("always yields a valid general-guide description for junk input", () => {
    for (const junk of [undefined, null, 42, "x", []]) {
      expect(parseHelpContext(sanitizeHelpContext(junk)).ok).toBe(true);
    }
    expect(emptyHelpContext().area).toBe("other");
  });

  it("never produces the reserved public surface for an unknown value", () => {
    expect(sanitizeHelpContext({ surface: "admin" }).surface).toBe("vault");
  });
});

describe("solo session context (Start Solo Session)", () => {
  const playPage = {
    v: 1,
    routeTemplate: "/(app)/play",
    area: "other",
    entityKind: null,
    tab: null,
    mode: "view",
    surface: "vault",
    flags: [],
    availableActions: ["play-start-solo-session"],
  };

  it("accepts the Play page with its start control", () => {
    expect(parseHelpContext(playPage).ok).toBe(true);
  });

  it("accepts the solo flag with the bar controls", () => {
    expect(
      parseHelpContext({
        ...playPage,
        routeTemplate: "/(app)/map",
        area: "map",
        flags: ["solo-session"],
        availableActions: ["solo-quick-roll", "solo-end-session"],
      }).ok,
    ).toBe(true);
  });

  it("rejects an unknown route template", () => {
    expect(
      parseHelpContext({ ...playPage, routeTemplate: "/(app)/play/extra" }).ok,
    ).toBe(false);
  });
});

describe("solo controls in guidance (highlight)", () => {
  const ctx = (over: Record<string, unknown>) =>
    sanitizeHelpContext({
      routeTemplate: "/(app)/map",
      area: "map",
      flags: [],
      availableActions: [],
      ...over,
    });
  const deps = { helpIds: new Set<string>() };

  it("points at the quick roll on any screen while the solo flag is on", () => {
    const action = validateAction(
      { type: "highlight", target: "solo-quick-roll", label: "Quick roll" },
      ctx({
        routeTemplate: "/(app)",
        area: "graph",
        flags: ["solo-session"],
        availableActions: ["solo-quick-roll"],
      }),
      deps,
    );
    expect(action).not.toBeNull();
  });

  it("refuses the quick roll when no solo session is running", () => {
    expect(
      validateAction(
        { type: "highlight", target: "solo-quick-roll", label: "Quick roll" },
        ctx({ flags: [], availableActions: ["solo-quick-roll"] }),
        deps,
      ),
    ).toBeNull();
  });

  it("points at the Play start control only when the screen reports it", () => {
    const onPlay = ctx({
      routeTemplate: "/(app)/play",
      area: "other",
      availableActions: ["play-start-solo-session"],
    });
    expect(
      validateAction(
        {
          type: "highlight",
          target: "play-start-solo-session",
          label: "Start",
        },
        onPlay,
        deps,
      ),
    ).not.toBeNull();
    expect(
      validateAction(
        {
          type: "highlight",
          target: "play-start-solo-session",
          label: "Start",
        },
        ctx({ routeTemplate: "/(app)/map", area: "map", availableActions: [] }),
        deps,
      ),
    ).toBeNull();
  });
});

describe("solo play loop controls (Solo Play Loop)", () => {
  const deps = { helpIds: new Set<string>() };
  const ctx = (over: Record<string, unknown>) =>
    sanitizeHelpContext({
      routeTemplate: "/(app)/map",
      area: "map",
      flags: [],
      availableActions: [],
      ...over,
    });

  it("refuses solo-threads-menu when it is not on the screen", () => {
    expect(
      validateAction(
        { type: "highlight", target: "solo-threads-menu", label: "Show me" },
        ctx({ flags: [], availableActions: [] }),
        deps,
      ),
    ).toBeNull();
  });

  it("points at solo-threads-menu on the Play page with no session running", () => {
    const action = validateAction(
      { type: "highlight", target: "solo-threads-menu", label: "Show me" },
      ctx({ flags: [], availableActions: ["solo-threads-menu"] }),
      deps,
    );
    expect(action).not.toBeNull();
  });

  for (const target of [
    "solo-generate-menu",
    "solo-recent-results",
    "solo-pinned-tables",
    "solo-party-menu",
    "solo-scene-menu",
    "solo-oracle-menu",
    "solo-yes-no-menu",
  ]) {
    it(`points at ${target} while a solo session runs`, () => {
      const action = validateAction(
        { type: "highlight", target, label: "Show me" },
        ctx({ flags: ["solo-session"], availableActions: [target] }),
        deps,
      );
      expect(action).not.toBeNull();
    });

    it(`refuses ${target} when no solo session runs`, () => {
      expect(
        validateAction(
          { type: "highlight", target, label: "Show me" },
          ctx({ flags: [], availableActions: [target] }),
          deps,
        ),
      ).toBeNull();
    });
  }
});
