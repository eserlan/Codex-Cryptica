import { BaseHandler } from "./base-handler";
import type { GuestHandlerContext } from "./guest-handler-context";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";

const HANDLED = new Set(["MAP_SYNC", "MAP_FOG_SYNC"]);

export class GuestMapAssetHandler extends BaseHandler<GuestHandlerContext> {
  canHandle(message: P2PMessage): boolean {
    return HANDLED.has(message.type);
  }

  async handle(
    message: P2PMessage,
    _connection: P2PConnection,
    context: GuestHandlerContext,
  ): Promise<void> {
    if (message.type === "MAP_SYNC") {
      await this.handleMapSync(message as any, context);
      return;
    }
    if (message.type === "MAP_FOG_SYNC") {
      await this.handleMapFogSync(message as any, context);
    }
  }

  private async handleMapSync(
    message: {
      payload?: {
        map?: any;
        image?: { mime?: string; data: ArrayBuffer };
        fog?: { mime?: string; data: ArrayBuffer };
      };
    },
    context: GuestHandlerContext,
  ) {
    const map = message.payload?.map;
    if (!map || typeof map.id !== "string") return;

    // Revoke prior asset+fog before issuing new URLs
    context.assetCache.revokeAll();

    const image = message.payload?.image;
    if (image?.data) {
      const blob = new Blob([image.data], {
        type: image.mime || "image/webp",
      });
      map.assetPath = context.assetCache.setAsset(blob);
    }

    const fog = message.payload?.fog;
    if (fog?.data) {
      const blob = new Blob([fog.data], { type: fog.mime || "image/png" });
      const fogUrl = context.assetCache.setFog(blob);
      if (map.fogOfWar) {
        map.fogOfWar.maskPath = fogUrl;
      } else {
        map.fogOfWar = { maskPath: fogUrl };
      }
    }

    context.vault.maps[map.id] = map;

    if (context.mapStore.activeMapId !== map.id) {
      context.mapStore.selectMap(map.id);
    }
  }

  private async handleMapFogSync(
    message: {
      payload?: {
        mapId?: string;
        fog?: { mime?: string; data: ArrayBuffer };
      };
    },
    context: GuestHandlerContext,
  ) {
    const mapId = message.payload?.mapId;
    const fog = message.payload?.fog;
    const currentMap = mapId ? context.vault.maps[mapId] : null;
    if (!mapId || !currentMap || !fog?.data) return;

    const blob = new Blob([fog.data], { type: fog.mime || "image/png" });
    const fogUrl = context.assetCache.setFog(blob);

    const nextMap = {
      ...currentMap,
      fogOfWar: {
        ...(currentMap.fogOfWar ?? { maskPath: fogUrl }),
        maskPath: fogUrl,
      },
    };

    context.vault.maps[mapId] = nextMap;
  }
}
