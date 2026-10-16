import type { HexCoord } from "map-engine";
import { matchFaction } from "hex-crawl-engine";
import type { HexCrawlStore } from "$lib/stores/hex-crawl/hex-crawl.svelte";
import type { HexDiscoveryController } from "$lib/services/hex-discovery";
import type { HexDiscoveryWiring } from "./discovery-controls";

export interface DiscoveryWiringInput {
  controller: HexDiscoveryController;
  store: HexCrawlStore;
  mapId: string;
  hex: HexCoord;
  /** Faction entities on the map, for matching the draft's faction presence. */
  factions: readonly { id: string; title: string }[];
  /** False when AI is disabled or the vault is a guest vault. */
  aiEnabled: boolean;
}

/**
 * Connects the discovery review card to the controller for one hex. Every
 * control maps to one controller call, and the card never sees the controller.
 */
export function buildDiscoveryWiring(
  input: DiscoveryWiringInput,
): HexDiscoveryWiring {
  const { controller, store, mapId, hex, factions, aiEnabled } = input;
  const draft = store.recordFor(mapId, hex)?.draft;
  const factionName = draft?.parts.factionPresence.factionName;
  const matched = factionName ? matchFaction(factionName, factions) : null;
  const factionMatch = matched
    ? {
        id: matched.id,
        title:
          factions.find((f) => f.id === matched.id)?.title ?? factionName ?? "",
      }
    : null;

  return {
    aiEnabled,
    explore: async (signal) => {
      const result = await controller.explore(mapId, hex, signal);
      return result.failure ? { failure: result.failure } : {};
    },
    controls: {
      retry: (signal) => controller.explore(mapId, hex, signal),
      rollTables: () => controller.rollTables(mapId, hex),
      regenerate: (part, signal) =>
        controller.regenerate(mapId, hex, part, signal),
      discardPart: (part) => controller.discardPart(mapId, hex, part),
      discardDraft: () => controller.discardDraft(mapId, hex),
      saveEntityPart: (part, options) =>
        controller.saveEntityPart(mapId, hex, part, options),
      saveNotePart: (part) => controller.saveNotePart(mapId, hex, part),
      saveFactionPart: (options) =>
        controller.saveFactionPart(mapId, hex, options),
    },
    proposedLink: controller.proposedLinkFor(mapId, hex),
    factionMatch,
  };
}
