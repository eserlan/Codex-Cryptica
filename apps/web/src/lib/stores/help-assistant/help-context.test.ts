import { describe, expect, it } from "vitest";
import {
  HelpContextStore,
  type HelpContextSources,
} from "./help-context.svelte";
import {
  HelpSurfaceRegistry,
  type EntityDetailSurface,
  type VttMapSurface,
} from "./help-surface.svelte";
import type { VttHelpFacts } from "help-engine";

const surface = (
  over: Partial<EntityDetailSurface> = {},
): EntityDetailSurface => ({
  entityKind: () => "location",
  activeTab: () => "connections",
  isEditing: () => false,
  canAddConnection: () => true,
  openTab: () => {},
  ...over,
});

function store(
  over: Partial<HelpContextSources> = {},
  registry = new HelpSurfaceRegistry(),
) {
  const sources: HelpContextSources = {
    getRouteId: () => "/(app)",
    surfaces: registry,
    isGeneratorOpen: () => false,
    generatorsAvailable: () => false,
    getOpenSettingsTab: () => null,
    isGuestMode: () => true,
    ...over,
  };
  return { ctx: new HelpContextStore(sources), registry };
}

const mapSurface = (
  facts: () => VttHelpFacts,
  actions: string[] = [],
): VttMapSurface => ({ facts, actions: () => actions, openPanel: () => true });

describe("HelpContextStore", () => {
  it("describes a journal or report overlay above the underlying entity", () => {
    for (const overlay of ["session-journal", "entity-reports"] as const) {
      const { ctx, registry } = store({ getOpenHelpArea: () => overlay });
      registry.registerEntityDetail(surface());
      expect(ctx.current).toMatchObject({
        area: overlay,
        tab: null,
        entityKind: null,
      });
      expect(ctx.current.availableActions).not.toContain("status-tab");
    }
  });

  describe("open sidebar panels", () => {
    it("adds a flag while the Explorer or the Shelf is open", () => {
      expect(
        store({
          isSidebarOpen: () => true,
          getActiveSidebarTool: () => "explorer",
        }).ctx.current.flags,
      ).toContain("explorer-open");
      expect(
        store({
          isSidebarOpen: () => true,
          getActiveSidebarTool: () => "shelf",
        }).ctx.current.flags,
      ).toContain("shelf-open");
    });

    it("adds no panel flag for the Oracle, for no panel, or when the source is absent", () => {
      for (const tool of ["oracle", "none"] as const) {
        const flags = store({
          isSidebarOpen: () => true,
          getActiveSidebarTool: () => tool,
        }).ctx.current.flags;
        expect(flags).not.toContain("explorer-open");
        expect(flags).not.toContain("shelf-open");
      }
      expect(store().ctx.current.flags).toEqual([]);
    });

    it("keeps the screen's own area, tab and other flags: a panel adds, never replaces", () => {
      const { ctx, registry } = store({
        getRouteId: () => "/(app)/canvas",
        isSidebarOpen: () => true,
        getActiveSidebarTool: () => "explorer",
        generatorsAvailable: () => true,
      });
      expect(ctx.current).toMatchObject({
        area: "canvas",
        routeTemplate: "/(app)/canvas",
      });
      expect(ctx.current.flags).toEqual(["generators", "explorer-open"]);

      registry.registerEntityDetail(surface());
      expect(ctx.current).toMatchObject({
        area: "entity-detail",
        tab: "connections",
        entityKind: "location",
      });
      expect(ctx.current.flags).toContain("explorer-open");
    });

    it("does not change the screen signature, so opening a panel does not make an answer look stale", () => {
      const open = store({
        isSidebarOpen: () => true,
        getActiveSidebarTool: () => "shelf",
      }).ctx;
      const closed = store({
        isSidebarOpen: () => true,
        getActiveSidebarTool: () => "none",
      }).ctx;

      expect(open.signature).toBe(closed.signature);
    });

    it("reads the panel live, so it follows the user opening and closing it", () => {
      let sidebarOpen = false;
      let tool: "explorer" | "none" = "none";
      const { ctx } = store({
        isSidebarOpen: () => sidebarOpen,
        getActiveSidebarTool: () => tool,
      });

      expect(ctx.current.flags).not.toContain("explorer-open");
      sidebarOpen = true;
      tool = "explorer";
      expect(ctx.current.flags).toContain("explorer-open");
      // Some UI actions hide the sidebar while leaving its selected tool intact.
      sidebarOpen = false;
      expect(ctx.current.flags).not.toContain("explorer-open");
      sidebarOpen = true;
      expect(ctx.current.flags).toContain("explorer-open");
    });
  });

  it("offers the journal panel only in a ready editable vault", () => {
    expect(
      store({ isGuestMode: () => false, journalAvailable: () => true }).ctx
        .current.availableActions,
    ).toContain("session-journal");
    expect(
      store({ isGuestMode: () => true, journalAvailable: () => true }).ctx
        .current.availableActions,
    ).not.toContain("session-journal");
    expect(
      store({ isGuestMode: () => false, journalAvailable: () => false }).ctx
        .current.availableActions,
    ).not.toContain("session-journal");
  });

  it("offers Stats and Timeline, but Family only for a character and no tabs in Zen Mode", () => {
    const { ctx, registry } = store();
    registry.registerEntityDetail(surface({ entityKind: () => "character" }));
    expect(ctx.current.availableActions).toEqual(
      expect.arrayContaining(["stats-tab", "family-tab", "timeline-tab"]),
    );
    registry.registerEntityDetail(surface({ entityKind: () => "item" }));
    expect(ctx.current.availableActions).not.toContain("family-tab");
    registry.registerZenEntityDetail(
      surface({ entityKind: () => "character", canSwitchTabs: () => false }),
    );
    expect(
      ctx.current.availableActions.filter((id) => id.endsWith("-tab")),
    ).toEqual([]);
  });

  it("recognises chronology and nested canvas routes without sending identifiers", () => {
    expect(
      store({ getRouteId: () => "/(app)/timeline" }).ctx.current.area,
    ).toBe("chronology");
    expect(
      store({ getRouteId: () => "/(app)/canvas/[slug]" }).ctx.current,
    ).toMatchObject({ area: "canvas", routeTemplate: "/(app)/canvas/[slug]" });
  });
  it("describes Settlement → Connections from the registered entity surface", () => {
    const { ctx, registry } = store();
    registry.registerEntityDetail(surface());
    expect(ctx.current).toEqual({
      v: 1,
      routeTemplate: "/(app)",
      area: "entity-detail",
      entityKind: "location",
      tab: "connections",
      mode: "view",
      surface: "vault",
      flags: ["connections-editable"],
      availableActions: [
        "status-tab",
        "connections-tab",
        "stats-tab",
        "timeline-tab",
      ],
    });
  });

  it("lists the Add button as available only on the Status tab", () => {
    const { ctx, registry } = store();
    registry.registerEntityDetail(surface({ activeTab: () => "status" }));
    expect(ctx.current.availableActions).toContain("add-connection-button");
  });

  it("offers Generate Related only when its Status control is visible", () => {
    const { ctx, registry } = store({ isGuestMode: () => false });
    registry.registerEntityDetail(
      surface({
        activeTab: () => "status",
        canGenerateRelated: () => true,
      }),
    );
    expect(ctx.current.availableActions).toContain("generate-related-button");

    registry.registerEntityDetail(
      surface({
        activeTab: () => "connections",
        canGenerateRelated: () => true,
      }),
    );
    expect(ctx.current.availableActions).not.toContain(
      "generate-related-button",
    );
  });

  it("describes Zen detail actions without claiming a tab strip", () => {
    const { ctx, registry } = store({ isGuestMode: () => false });
    registry.registerZenEntityDetail(
      surface({
        activeTab: () => "status",
        canGenerateRelated: () => true,
        canSwitchTabs: () => false,
      }),
    );
    expect(ctx.current).toMatchObject({
      area: "entity-detail",
      tab: "status",
    });
    expect(ctx.current.availableActions).toContain("generate-related-button");
    expect(ctx.current.availableActions).not.toContain("connections-tab");
  });

  it("does not claim connections are editable in a read-only vault", () => {
    const { ctx, registry } = store();
    registry.registerEntityDetail(
      surface({ activeTab: () => "status", canAddConnection: () => false }),
    );
    expect(ctx.current.flags).not.toContain("connections-editable");
    expect(ctx.current.availableActions).not.toContain("add-connection-button");
  });

  it("collapses a user-defined category to custom", () => {
    const { ctx, registry } = store();
    registry.registerEntityDetail(surface({ entityKind: () => "Settlement" }));
    expect(ctx.current.entityKind).toBe("custom");
  });

  it("reports edit mode", () => {
    const { ctx, registry } = store();
    registry.registerEntityDetail(surface({ isEditing: () => true }));
    expect(ctx.current.mode).toBe("edit");
  });

  it("describes the graph, tables and generators when no entry is open", () => {
    expect(store().ctx.current.area).toBe("graph");
    expect(store({ getRouteId: () => "/(app)/tables" }).ctx.current.area).toBe(
      "tables",
    );
    expect(
      store({ isGeneratorOpen: () => true, generatorsAvailable: () => true })
        .ctx.current,
    ).toMatchObject({ area: "generators", flags: ["generators"] });
  });

  it("never carries a resolved path, even if a provider reports one", () => {
    const { ctx } = store({
      getRouteId: () => "/vault/3f2a9c1e-7b1d/entity/9b1c",
    });
    expect(ctx.current.routeTemplate).toBe("unknown");
  });

  it("falls back to a general-guide description when a provider throws", () => {
    const { ctx } = store({
      getRouteId: () => {
        throw new Error("boom");
      },
    });
    expect(ctx.current).toMatchObject({
      area: "other",
      tab: null,
      entityKind: null,
    });
  });

  it("changes signature when the tab changes, so a late answer can be flagged", () => {
    let tab = "connections";
    const { ctx, registry } = store();
    registry.registerEntityDetail(surface({ activeTab: () => tab }));
    const before = ctx.signature;
    tab = "status";
    expect(ctx.signature).not.toBe(before);
  });

  it("does not let an older registration remove a newer one", () => {
    const registry = new HelpSurfaceRegistry();
    const first = registry.registerEntityDetail(surface());
    const second = surface({ entityKind: () => "faction" });
    registry.registerEntityDetail(second);
    first();
    expect(registry.entityDetail).toBe(second);
  });

  describe("solo sessions", () => {
    it("flags a running solo session and offers its bar controls on any screen", () => {
      const { ctx } = store({
        getRouteId: () => "/(app)/map",
        isGuestMode: () => false,
        soloSession: () => ({ active: true }),
      });
      expect(ctx.current.flags).toContain("solo-session");
      expect(ctx.current.availableActions).toEqual(
        expect.arrayContaining(["solo-quick-roll", "solo-end-session"]),
      );
      expect(ctx.current.availableActions).not.toContain(
        "play-start-solo-session",
      );
    });

    it("offers starting a session on the Play page only when none is running", () => {
      const idle = store({
        getRouteId: () => "/(app)/play",
        isGuestMode: () => false,
        soloSession: () => ({ active: false }),
      });
      expect(idle.ctx.current.availableActions).toContain(
        "play-start-solo-session",
      );
      expect(idle.ctx.current.flags).not.toContain("solo-session");
      expect(idle.ctx.current.availableActions).not.toContain(
        "solo-quick-roll",
      );
    });

    it("offers no solo controls in guest mode, and no flag", () => {
      const { ctx } = store({
        getRouteId: () => "/(app)/play",
        isGuestMode: () => true,
        soloSession: () => ({ active: true }),
      });
      expect(ctx.current.flags).not.toContain("solo-session");
      expect(ctx.current.availableActions).not.toContain("solo-quick-roll");
      expect(ctx.current.availableActions).not.toContain(
        "play-start-solo-session",
      );
    });

    it("keeps the Play start control off other routes", () => {
      const { ctx } = store({
        getRouteId: () => "/(app)/map",
        isGuestMode: () => false,
        soloSession: () => ({ active: false }),
      });
      expect(ctx.current.availableActions).not.toContain(
        "play-start-solo-session",
      );
    });
  });

  it("describes the canvas, map and import screens from the route", () => {
    for (const [route, area] of [
      ["/(app)/canvas", "canvas"],
      ["/(app)/map", "map"],
      ["/(app)/import", "import"],
    ] as const) {
      expect(store({ getRouteId: () => route }).ctx.current.area, route).toBe(
        area,
      );
    }
  });

  it("describes an open Settings tab and lets it win over what is underneath", () => {
    const { ctx, registry } = store({
      getOpenSettingsTab: () => "vault",
      isGeneratorOpen: () => true,
    });
    registry.registerEntityDetail(surface());
    expect(ctx.current).toMatchObject({
      area: "settings",
      tab: "vault",
      entityKind: null,
      mode: "view",
    });
  });

  it("puts an open generator above an open entry, and an entry above the route", () => {
    const { ctx, registry } = store({ isGeneratorOpen: () => true });
    registry.registerEntityDetail(surface());
    expect(ctx.current.area).toBe("generators");
    expect(ctx.current.entityKind).toBeNull();
    const entry = store();
    entry.registry.registerEntityDetail(surface());
    expect(entry.ctx.current.area).toBe("entity-detail");
  });

  it("offers the Settings panels on every screen of a real vault", () => {
    const panels = [
      "settings-vault",
      "settings-intelligence",
      "settings-schema",
      "settings-templates",
      "settings-theme",
      "settings-publishing",
    ];
    for (const route of ["/(app)", "/(app)/canvas", "/(app)/map"]) {
      const { ctx } = store({
        getRouteId: () => route,
        isGuestMode: () => false,
      });
      expect(ctx.current.availableActions, route).toEqual(panels);
    }
    const { ctx, registry } = store({ isGuestMode: () => false });
    registry.registerEntityDetail(surface());
    expect(ctx.current.availableActions).toEqual([
      "status-tab",
      "connections-tab",
      "stats-tab",
      "timeline-tab",
      ...panels,
    ]);
  });

  it("offers no Settings panel in a guest or demo vault, even with Settings open", () => {
    const { ctx } = store({
      isGuestMode: () => true,
      getOpenSettingsTab: () => "vault",
    });
    expect(ctx.current.area).toBe("settings");
    expect(
      ctx.current.availableActions.filter((a) => a.startsWith("settings-")),
    ).toEqual([]);
  });

  it("drops a Settings tab that does not belong to the screen it is reported on", () => {
    const { ctx } = store({ getOpenSettingsTab: () => "not-a-tab" });
    expect(ctx.current.tab).toBeNull();
  });

  it("always produces only the agreed keys", () => {
    const { ctx, registry } = store();
    registry.registerEntityDetail(surface());
    expect(Object.keys(ctx.current).sort()).toEqual([
      "area",
      "availableActions",
      "entityKind",
      "flags",
      "mode",
      "routeTemplate",
      "surface",
      "tab",
      "v",
    ]);
  });

  describe("VTT facts on the map", () => {
    const facts = (over: Record<string, unknown> = {}) => ({
      vttOn: true,
      combat: true,
      guest: false,
      playerView: false,
      grid: "hex" as const,
      fogOn: true,
      soloFog: false,
      tokenSelected: true,
      tokenLinked: false,
      tokenManageable: true,
      layer: "token" as const,
      hasInitiative: true,
      canAdvanceTurn: false,
      hosting: false,
      measuring: false,
      ...over,
    });

    it("adds the map facts as flags while the map is the screen", () => {
      const { ctx, registry } = store({ getRouteId: () => "/(app)/map" });
      registry.registerVttMap(mapSurface(() => facts()));

      expect(ctx.current.area).toBe("map");
      expect(ctx.current.flags).toEqual(
        expect.arrayContaining([
          "vtt-on",
          "vtt-combat",
          "vtt-grid-hex",
          "vtt-fog-on",
          "vtt-token-selected",
          "vtt-token-manageable",
          "vtt-layer-tokens",
          "vtt-has-initiative",
        ]),
      );
      expect(ctx.current.flags).not.toContain("vtt-can-advance-turn");
    });

    it("follows the live state each time it is read", () => {
      const { ctx, registry } = store({ getRouteId: () => "/(app)/map" });
      let combat = false;
      registry.registerVttMap(mapSurface(() => facts({ combat })));

      expect(ctx.current.flags).not.toContain("vtt-combat");
      combat = true;
      expect(ctx.current.flags).toContain("vtt-combat");
    });

    it("keeps the map facts off every other screen and under an open dialog", () => {
      const { ctx, registry } = store({ getRouteId: () => "/(app)/tables" });
      registry.registerVttMap(mapSurface(() => facts()));
      expect(ctx.current.flags).toEqual([]);

      const settings = store({
        getRouteId: () => "/(app)/map",
        getOpenSettingsTab: () => "vault",
      });
      settings.registry.registerVttMap(mapSurface(() => facts()));
      expect(settings.ctx.current.flags.some((f) => f.startsWith("vtt-"))).toBe(
        false,
      );
    });

    it("falls back to a general description if the map cannot report", () => {
      const { ctx, registry } = store({ getRouteId: () => "/(app)/map" });
      registry.registerVttMap(
        mapSurface(() => {
          throw new Error("store not ready");
        }),
      );

      expect(ctx.current.area).toBe("other");
      expect(ctx.current.flags).toEqual([]);
    });

    it("lists the map's reachable panels and controls while the map is the screen", () => {
      const { ctx, registry } = store({ getRouteId: () => "/(app)/map" });
      registry.registerVttMap(
        mapSurface(() => facts(), ["vtt-sidebar", "vtt-fog-toggle"]),
      );

      expect(ctx.current.availableActions).toEqual(
        expect.arrayContaining(["vtt-sidebar", "vtt-fog-toggle"]),
      );
    });

    it("lists none of them on another screen, or when the user is a player with nothing to reach", () => {
      const tables = store({ getRouteId: () => "/(app)/tables" });
      tables.registry.registerVttMap(
        mapSurface(() => facts(), ["vtt-sidebar"]),
      );
      expect(tables.ctx.current.availableActions).not.toContain("vtt-sidebar");

      const player = store({ getRouteId: () => "/(app)/map" });
      player.registry.registerVttMap(mapSurface(() => facts({ guest: true })));
      expect(
        player.ctx.current.availableActions.filter((a) => a.startsWith("vtt-")),
      ).toEqual([]);
    });

    it("does not treat a changed selection as a different screen", () => {
      const { ctx, registry } = store({ getRouteId: () => "/(app)/map" });
      let selected = false;
      registry.registerVttMap(
        mapSurface(() => facts({ tokenSelected: selected })),
      );
      const before = ctx.signature;
      selected = true;

      expect(ctx.signature).toBe(before);
    });
  });
});
