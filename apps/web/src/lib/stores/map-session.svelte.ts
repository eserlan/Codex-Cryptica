import { vault } from "./vault.svelte";
import { mapStore } from "./map.svelte";
import { VTTSessionService } from "$lib/services/vtt-session";
import type { SessionMode } from "../../types/vtt";
import { initializeMapSessionComposition } from "./vtt/map-session-composition.svelte";
import { MapSessionFacade } from "./vtt/map-session-facade";

import { type StorageLike } from "$lib/utils/runtime-deps";

export interface MapSessionDependencies {
  mapStore: typeof mapStore;
  vault: typeof vault;
  service?: VTTSessionService;
  sessionStorage?: StorageLike;
  localStorage?: StorageLike;
}

export class MapSessionStore extends MapSessionFacade {
  readonly deps: MapSessionDependencies;
  vttEnabled = $state(false);
  mapId = $state<string | null>(null);
  mode = $state<SessionMode>("exploration");

  sessionFogMask = $state<string | null>(null);
  myPeerId = $state<string | null>(null);
  private readonly service: VTTSessionService;

  constructor(deps: MapSessionDependencies) {
    super();
    this.deps = deps;
    this.service =
      deps.service ??
      new VTTSessionService({
        getActiveVaultHandle: () => this.deps.vault.getActiveVaultHandle(),
      });

    initializeMapSessionComposition(this, this.service);
  }
}

const MAP_SESSION_KEY = "__codex_map_session_instance__";
export const mapSession: MapSessionStore =
  (globalThis as any)[MAP_SESSION_KEY] ??
  ((globalThis as any)[MAP_SESSION_KEY] = new MapSessionStore({
    mapStore,
    vault,
  }));

if (typeof window !== "undefined") {
  (window as any).mapSession = mapSession;
}
