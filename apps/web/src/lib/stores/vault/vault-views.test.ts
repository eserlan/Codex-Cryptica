import { describe, expect, it } from "vitest";
import { VaultViews } from "./vault-views";
import type { LocalEntity } from "./types";

function entity(id: string, extra: Partial<LocalEntity> = {}): LocalEntity {
  return {
    id,
    title: id,
    type: "character",
    content: "",
    connections: [],
    labels: [],
    ...extra,
  } as LocalEntity;
}
function setup() {
  const guestHero = entity("hero", {
    title: "Guest Hero",
    aliases: ["", "A very long alias"],
    labels: ["one", "one", "two"],
    visibility: "hidden",
  });
  const localHero = entity("hero", { title: "Local Hero" });
  const extra = entity("extra", { labels: ["local"] });
  const host = {
    entities: { hero: localHero, extra },
    allEntities: [localHero, extra],
    graphEntities: [localHero],
    graphStructureVersion: 42,
    titleAndAliasIndex: [],
    inboundConnections: {},
    labelIndex: ["local"],
    labelCounts: { local: 1 },
  };
  const deps = {
    entityStore: () => host,
    mode: { isGuestMode: false },
    guest: {
      isInitialized: false,
      entities: [guestHero],
      entitiesMap: { hero: guestHero },
      relationships: [
        { sourceId: "hero", targetId: "extra", label: "friend" },
        { sourceId: "extra", targetId: "hero" },
      ],
      maps: [{ id: "guest-map" }],
      canvases: [{ id: "guest-canvas" }],
      publishId: "published",
      vaultTitle: "Guest World",
    },
    maps: { maps: { host: {} }, allMaps: [{}] },
    canvases: { canvases: { host: {} } },
    registry: {
      activeVaultId: "host",
      activeVaultRecord: { id: "host" },
      vaultName: "Host World",
    },
  } as unknown as ConstructorParameters<typeof VaultViews>[0];
  return {
    views: new VaultViews(deps),
    deps,
    host,
    guestHero,
    localHero,
    extra,
  };
}

describe("VaultViews", () => {
  it("returns host data directly and reads replacement stores on demand", () => {
    const { views, deps, host } = setup();
    expect(views.entities).toBe(host.entities);
    expect(views.allEntities).toBe(host.allEntities);
    expect(views.graphEntities).toBe(host.graphEntities);
    expect(views.graphStructureVersion).toBe(42);
    expect(views.titleAndAliasIndex).toBe(host.titleAndAliasIndex);
    expect(views.inboundConnections).toBe(host.inboundConnections);
    expect(views.labelIndex).toBe(host.labelIndex);
    expect(views.labelCounts).toBe(host.labelCounts);
    expect(views.maps).toBe(deps.maps.maps);
    expect(views.allMaps).toBe(deps.maps.allMaps);
    expect(views.canvases).toBe(deps.canvases.canvases);
    expect(views.activeVaultId).toBe("host");
    expect(views.activeVaultRecord).toBe(deps.registry.activeVaultRecord);
    expect(views.vaultName).toBe("Host World");
    deps.entityStore = () => ({ ...host, graphStructureVersion: 99 });
    expect(views.graphStructureVersion).toBe(99);
  });

  it("merges local extras while keeping guest graph and list entities authoritative", () => {
    const { views, deps, guestHero, localHero, extra } = setup();
    expect(views.isPublishedGuest).toBe(false);
    deps.mode.isGuestMode = true;
    expect(views.isPublishedGuest).toBe(true);
    expect(views.isGuestInitialized).toBe(false);
    deps.guest.isInitialized = true;
    expect(views.isGuestInitialized).toBe(true);
    // The record historically allows local overrides; the list preserves snapshot identities.
    expect(views.entities.hero).toBe(localHero);
    expect(views.allEntities).toEqual([guestHero, extra]);
    expect(views.graphEntities).toBe(deps.guest.entities);
    expect(views.graphStructureVersion).toBe(1);
    expect(views.maps["guest-map"].id).toBe("guest-map");
    expect(Object.getPrototypeOf(views.maps)).toBeNull();
    expect(views.allMaps).toBe(deps.guest.maps);
    expect(views.canvases["guest-canvas"].id).toBe("guest-canvas");
    expect(views.activeVaultId).toBe("published");
    expect(views.vaultName).toBe("Guest World");
  });

  it("indexes guest aliases, relationships and unique labels without host data leaking", () => {
    const { views, deps } = setup();
    deps.mode.isGuestMode = true;
    expect(views.titleAndAliasIndex).toEqual([
      expect.objectContaining({
        lowercaseText: "a very long alias",
        isAlias: true,
        actualTitle: "Guest Hero",
        visibility: "hidden",
        status: "active",
      }),
      expect.objectContaining({ lowercaseText: "guest hero", isAlias: false }),
    ]);
    expect(views.labelIndex).toEqual(["one", "two"]);
    expect(views.labelCounts).toEqual({ one: 1, two: 1 });
    expect(views.inboundConnections.extra).toEqual([
      {
        sourceId: "hero",
        connection: { target: "extra", type: "friend", label: "friend" },
      },
    ]);
    expect(views.inboundConnections.hero[0].connection.type).toBe("neutral");
    deps.guest.entities = [];
    deps.guest.relationships = [];
    expect(views.titleAndAliasIndex).toEqual([]);
    expect(views.labelCounts).toEqual({});
    expect(Object.keys(views.inboundConnections)).toEqual([]);
    deps.mode.isGuestMode = false;
    expect(views.vaultName).toBe("Host World");
  });
});
