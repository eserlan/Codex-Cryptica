import { describe, expect, it } from "vitest";
import {
  HelpContextStore,
  type HelpContextSources,
} from "./help-context.svelte";
import {
  HelpSurfaceRegistry,
  type EntityDetailSurface,
} from "./help-surface.svelte";

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
    ...over,
  };
  return { ctx: new HelpContextStore(sources), registry };
}

describe("HelpContextStore", () => {
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
      availableActions: ["status-tab", "connections-tab"],
    });
  });

  it("lists the Add button as available only on the Status tab", () => {
    const { ctx, registry } = store();
    registry.registerEntityDetail(surface({ activeTab: () => "status" }));
    expect(ctx.current.availableActions).toContain("add-connection-button");
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
});
