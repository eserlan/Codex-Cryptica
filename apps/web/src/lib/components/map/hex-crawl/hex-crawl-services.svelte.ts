import {
  formatHexLabel,
  getTokenCenter,
  pointToHex,
  type HexCoord,
} from "map-engine";
import { HexDiscoveryService, formatSeed } from "hex-crawl-engine";
import { aiClientManager } from "@codex/ai-engine";
import { HexCrawlStore } from "#lib/stores/hex-crawl/hex-crawl.svelte.js";
import { HexCrawlMoveObserver } from "#lib/stores/hex-crawl/hex-crawl-move-observer.js";
import { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";
import { GeographyGenerationStore } from "#lib/stores/hex-crawl/geography-generation.svelte.js";
import { HexJourneyStore } from "#lib/stores/hex-crawl/hex-journey.svelte.js";
import { HexDiscoveryController } from "#lib/services/hex-discovery.js";
import { mapStore } from "#lib/stores/map.svelte.js";
import { mapSession } from "#lib/stores/map-session.svelte.js";
import { vault } from "#lib/stores/vault.svelte.js";
import { oracle } from "#lib/stores/oracle.svelte.js";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";
import { browserStorage, systemClock } from "#lib/utils/runtime-deps.js";
import { publishSoloMapMove } from "../solo-exploration-recorder.svelte";
import { activeHexGridConfig, hexOnMap } from "./hex-crawl-view";
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
  journey: HexJourneyStore;
  region: RegionGenerationStore;
  geography: GeographyGenerationStore;
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
    saveMaps: () => vault.saveMapsWithResult(),
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

  const journey = new HexJourneyStore({
    getIdentity: () => {
      const mapId = mapStore.activeMapId;
      const config = activeHexGridConfig(mapStore);
      if (!mapId || !config || !store.isEnabled(mapId)) return null;
      return {
        mapId,
        vaultId: vault.activeVaultId ?? "",
        gridDistance: mapSession.gridDistance,
        gridUnit: mapSession.gridUnit,
        gridSignature: `${config.orientation}:${config.size}:${config.offsetX}:${config.offsetY}`,
      };
    },
    isAllowed: () => !sessionModeStore.isGuestMode && mapStore.isGMMode,
    listEligibleTokens: () => {
      const config = activeHexGridConfig(mapStore);
      if (!config) return [];
      return mapSession.allTokens
        .filter(
          (token) =>
            token.isVisionSource === true &&
            !token.locked &&
            mapSession.canMoveToken(
              token.id,
              mapSession.myPeerId,
              mapStore.isGMMode,
            ),
        )
        .map((token) => ({
          id: token.id,
          label: token.name,
          hex: pointToHex(getTokenCenter(token), config),
        }));
    },
    onStart: () => true,
    // Step movement is connected by the map journey adapter in the next integration slice.
    onStep: () => false,
  });

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

  const inBounds = (mapId: string, hex: HexCoord) => {
    const dimensions = vault.maps[mapId]?.dimensions;
    return dimensions
      ? hexOnMap(dimensions, activeHexGridConfig(mapStore))(hex)
      : false;
  };
  const newSeed = () => formatSeed(crypto.getRandomValues(new Uint8Array(8)));

  const region = new RegionGenerationStore({
    hexes: store,
    inBounds,
    newSeed,
    storage: browserStorage,
    clock: systemClock,
    canEdit: () => !sessionModeStore.isGuestMode && mapStore.isGMMode,
  });

  const geography = new GeographyGenerationStore({
    hexes: store,
    inBounds,
    newSeed,
    canEdit: () => !sessionModeStore.isGuestMode && mapStore.isGMMode,
    settlements: (mapId) => {
      const config = activeHexGridConfig(mapStore);
      return (vault.maps[mapId]?.pins ?? []).flatMap((pin) => {
        if (!pin.entityId || vault.entities[pin.entityId]?.type !== "location")
          return [];
        if (pin.hexCoordinates) return [pin.hexCoordinates];
        return config && pin.coordinates
          ? [pointToHex(pin.coordinates, config)]
          : [];
      });
    },
  });

  return { store, observer, controller, offer, journey, region, geography };
}
