import { formatHexLabel, type HexCoord } from "map-engine";
import { HexDiscoveryService } from "hex-crawl-engine";
import { aiClientManager } from "@codex/ai-engine";
import { HexCrawlStore } from "$lib/stores/hex-crawl/hex-crawl.svelte";
import { HexCrawlMoveObserver } from "$lib/stores/hex-crawl/hex-crawl-move-observer";
import { HexDiscoveryController } from "$lib/services/hex-discovery";
import { mapStore } from "$lib/stores/map.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { oracle } from "$lib/stores/oracle.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { systemClock } from "$lib/utils/runtime-deps";
import { publishSoloMapMove } from "../solo-exploration-recorder.svelte";
import { activeHexGridConfig } from "./hex-crawl-view";
import { pinAtHex as pinAtHexOnScreen } from "./hex-map-port";

const REGION_CONTEXT_LIMIT = 1_500;

/** The solo "explore this hex" offer currently shown, if any (FR-035). */
class ExploreOfferState {
  current = $state<{ mapId: string; hex: HexCoord } | null>(null);
}

export interface HexCrawlServices {
  store: HexCrawlStore;
  observer: HexCrawlMoveObserver;
  controller: HexDiscoveryController;
  offer: ExploreOfferState;
}

/** Orientation of the active map's hex grid, for labels. */
function activeOrientation(): "pointy" | "flat" {
  return mapStore.gridType === "hex-flat" ? "flat" : "pointy";
}

/** The map's region entity, when it has one, as campaign context for the prompt. */
function regionContext(): string | undefined {
  const mapId = mapStore.activeMapId;
  const parentId = mapId ? vault.maps[mapId]?.parentEntityId : undefined;
  const region = parentId ? vault.entities[parentId] : undefined;
  if (!region) return undefined;
  const text = `Region: ${region.title}. ${region.content}`.trim();
  return text.slice(0, REGION_CONTEXT_LIMIT);
}

/**
 * Builds the hex crawl services once per map view. Every dependency is a real
 * app store here, and nothing else in the feature reaches for a singleton
 * (Constitution VIII).
 */
export function createHexCrawlServices(): HexCrawlServices {
  const store = new HexCrawlStore({
    getMap: (id) => vault.maps[id],
    saveMaps: async () => {
      await vault.saveMaps();
      return true;
    },
    clock: systemClock,
    publishCapture: (payload) =>
      publishSoloMapMove(
        payload as Parameters<typeof publishSoloMapMove>[0],
        systemClock,
      ),
    isGM: () => !sessionModeStore.isGuestMode && mapStore.isGMMode,
    isGuest: () => sessionModeStore.isGuestMode,
  });

  const offer = new ExploreOfferState();

  const controller = new HexDiscoveryController({
    service: new HexDiscoveryService({ rng: Math.random, clock: systemClock }),
    aiClient: aiClientManager,
    settings: oracle,
    isAiDisabled: () => discoveryPolicyStore.aiDisabled,
    isGuest: () => sessionModeStore.isGuestMode,
    vault,
    mapStore: {
      pinAtHex: (mapId, entityId, hex) =>
        pinAtHexOnScreen(
          mapStore,
          activeHexGridConfig(mapStore),
          mapId,
          entityId,
          hex,
        ),
      removePin: (entityId) => mapStore.removePinsForEntity(entityId),
      formatHex: (hex) =>
        formatHexLabel(hex, mapStore.hexLabelConfig, activeOrientation()),
    },
    store,
    clock: systemClock,
    campaignContext: regionContext,
  });

  const observer = new HexCrawlMoveObserver({
    store,
    getActiveMapId: () => mapStore.activeMapId,
    getHexConfig: () => activeHexGridConfig(mapStore),
    isHexCrawlOn: (mapId) => store.isEnabled(mapId),
    isGM: () => !sessionModeStore.isGuestMode && mapStore.isGMMode,
    isSolo: () => mapStore.soloFog,
    offerExplore: (mapId, hex) => {
      offer.current = { mapId, hex };
    },
  });

  return { store, observer, controller, offer };
}
