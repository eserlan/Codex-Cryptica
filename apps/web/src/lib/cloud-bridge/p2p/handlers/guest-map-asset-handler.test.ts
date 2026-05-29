import { describe, it, expect, vi, beforeEach } from "vitest";
import { GuestMapAssetHandler } from "./guest-map-asset-handler";
import { MapAssetUrlCache } from "./map-asset-url-cache";

describe("GuestMapAssetHandler", () => {
  let handler: GuestMapAssetHandler;
  let ctx: any;
  let createSpy: ReturnType<typeof vi.fn>;
  let revokeSpy: ReturnType<typeof vi.fn>;
  let counter: number;
  const conn = { peer: "host", send: vi.fn(), close: vi.fn() } as any;

  beforeEach(() => {
    counter = 0;
    createSpy = vi.fn(() => `blob:url-${++counter}`);
    revokeSpy = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: createSpy,
      revokeObjectURL: revokeSpy,
    } as any);
    handler = new GuestMapAssetHandler();
    ctx = {
      assetCache: new MapAssetUrlCache(),
      vault: { maps: {} as Record<string, any> },
      mapStore: { activeMapId: null, selectMap: vi.fn() },
    };
  });

  it("claims map asset message types", () => {
    expect(handler.canHandle({ type: "MAP_SYNC" } as any)).toBe(true);
    expect(handler.canHandle({ type: "MAP_FOG_SYNC" } as any)).toBe(true);
    expect(handler.canHandle({ type: "GRAPH_SYNC" } as any)).toBe(false);
  });

  it("creates fresh Object URLs for image + fog on MAP_SYNC and stores the map", async () => {
    const message = {
      type: "MAP_SYNC",
      payload: {
        map: { id: "map-1", fogOfWar: null },
        image: { mime: "image/webp", data: new ArrayBuffer(8) },
        fog: { mime: "image/png", data: new ArrayBuffer(4) },
      },
    };
    await handler.handle(message as any, conn, ctx);

    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(ctx.vault.maps["map-1"].assetPath).toBe("blob:url-1");
    expect(ctx.vault.maps["map-1"].fogOfWar.maskPath).toBe("blob:url-2");
    expect(ctx.mapStore.selectMap).toHaveBeenCalledWith("map-1");
  });

  it("revokes prior URLs when a second MAP_SYNC arrives", async () => {
    const make = (id: string) => ({
      type: "MAP_SYNC",
      payload: {
        map: { id, fogOfWar: null },
        image: { mime: "image/webp", data: new ArrayBuffer(8) },
        fog: { mime: "image/png", data: new ArrayBuffer(4) },
      },
    });

    await handler.handle(make("m1") as any, conn, ctx);
    revokeSpy.mockClear();
    await handler.handle(make("m2") as any, conn, ctx);

    // revokeAll() runs first; nothing to revoke before MAP_SYNC #2 except the
    // two slots already populated by MAP_SYNC #1.
    expect(revokeSpy).toHaveBeenCalledWith("blob:url-1");
    expect(revokeSpy).toHaveBeenCalledWith("blob:url-2");
  });

  it("ignores MAP_SYNC without a map id", async () => {
    await handler.handle(
      { type: "MAP_SYNC", payload: { map: null } } as any,
      conn,
      ctx,
    );
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("updates fog mask in place on MAP_FOG_SYNC", async () => {
    ctx.vault.maps["map-1"] = { id: "map-1", fogOfWar: { maskPath: "old" } };
    await handler.handle(
      {
        type: "MAP_FOG_SYNC",
        payload: {
          mapId: "map-1",
          fog: { mime: "image/png", data: new ArrayBuffer(4) },
        },
      } as any,
      conn,
      ctx,
    );
    expect(ctx.vault.maps["map-1"].fogOfWar.maskPath).toBe("blob:url-1");
  });

  it("ignores MAP_FOG_SYNC for unknown maps", async () => {
    await handler.handle(
      {
        type: "MAP_FOG_SYNC",
        payload: {
          mapId: "missing",
          fog: { mime: "image/png", data: new ArrayBuffer(4) },
        },
      } as any,
      conn,
      ctx,
    );
    expect(createSpy).not.toHaveBeenCalled();
  });
});
