import type { Map, Point, ViewportTransform } from "schema";
import { vault as defaultVault } from "./vault.svelte";
import { browserStorage, type StorageLike } from "#lib/utils/runtime-deps.js";
import { sessionModeStore } from "./ui/session-mode.svelte";
import { guestVault } from "./guest-vault.svelte";
import type { MapDisplaySettings } from "./map-display-settings.svelte";

const MAP_PAGE_STATE_STORAGE_PREFIX = "codex-map-page-state";
const DEFAULT_VIEWPORT: ViewportTransform = { pan: { x: 0, y: 0 }, zoom: 1 };
type PersistedMapPageState = {
  activeMapId: string | null;
  viewports: Record<string, ViewportTransform>;
};
type NavigationState = {
  activeMapId: string | null;
  viewport: ViewportTransform;
  navigationStack: string[];
  worldMap: Map | null;
};

/** Map selection history, per-vault page state and viewport persistence. */
export class MapNavigation {
  private pendingActiveMapId = $state<string | null>(null);
  private _viewportPersistTimer: ReturnType<typeof setTimeout> | null = null;
  private static _vaultSwitchHandler: (() => void) | null = null;

  constructor(
    private readonly state: NavigationState,
    private readonly settings: Pick<
      MapDisplaySettings,
      "applySettings" | "isRestoringSettings"
    >,
    private readonly storage: StorageLike = browserStorage,
    private readonly vault: Pick<
      typeof defaultVault,
      "maps" | "activeVaultId"
    > = defaultVault,
    private readonly canSelectFirstMap = () =>
      !sessionModeStore.isGuestMode || !!guestVault.publishId,
  ) {}

  start() {
    if (MapNavigation._vaultSwitchHandler) {
      window.removeEventListener(
        "vault-switched",
        MapNavigation._vaultSwitchHandler,
      );
    }
    MapNavigation._vaultSwitchHandler = () => {
      this.state.navigationStack = [];
      this.pendingActiveMapId = null;
      this.restorePageState();
    };
    window.addEventListener(
      "vault-switched",
      MapNavigation._vaultSwitchHandler,
    );
    $effect.root(() => {
      $effect(() => this.autoSelectMap());
    });
  }

  private restorePendingMap(maps: Record<string, Map>): boolean {
    const pendingMapId = this.pendingActiveMapId;
    if (!pendingMapId || !maps[pendingMapId]) return false;
    this.pendingActiveMapId = null;
    this.selectMap(pendingMapId);
    return true;
  }

  private autoSelectMap() {
    const maps = this.vault.maps ?? {};
    if (this.restorePendingMap(maps)) return;
    const pendingMapId = this.pendingActiveMapId;
    const hasLoadedMaps = Object.keys(maps).length > 0;
    if (this.hasValidSelection(maps) || pendingMapId) return;
    if (this.state.worldMap) {
      this.selectMap(this.state.worldMap.id);
    } else if (hasLoadedMaps && this.canSelectFirstMap()) {
      this.selectMap(Object.keys(maps)[0]);
    }
  }

  private hasValidSelection(maps: Record<string, Map>): boolean {
    const id = this.state.activeMapId;
    if (!id) return false;
    return Object.keys(maps).length === 0 || !!maps[id];
  }

  private getPageStateStorageKey(
    vaultId = this.vault.activeVaultId ?? "default",
  ) {
    return `${MAP_PAGE_STATE_STORAGE_PREFIX}:${vaultId}`;
  }

  private readPageState(): PersistedMapPageState | null {
    if (typeof window === "undefined") return null;

    try {
      const raw = this.storage.getItem(this.getPageStateStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PersistedMapPageState>;
      return {
        activeMapId:
          typeof parsed.activeMapId === "string" || parsed.activeMapId === null
            ? parsed.activeMapId
            : null,
        viewports:
          parsed.viewports && typeof parsed.viewports === "object"
            ? Object.fromEntries(
                Object.entries(parsed.viewports).filter(([, viewport]) =>
                  this.isViewportTransform(viewport),
                ),
              )
            : {},
      };
    } catch {
      return null;
    }
  }

  private isViewportTransform(value: unknown): value is ViewportTransform {
    if (!value || typeof value !== "object") return false;
    const viewport = value as ViewportTransform;
    return (
      !!viewport.pan &&
      typeof viewport.pan.x === "number" &&
      typeof viewport.pan.y === "number" &&
      typeof viewport.zoom === "number"
    );
  }

  private persistPageState() {
    if (typeof window === "undefined" || this.settings.isRestoringSettings) {
      return;
    }

    const pageState = this.readPageState() ?? {
      activeMapId: null,
      viewports: {},
    };

    if (this.state.activeMapId) {
      pageState.activeMapId = this.state.activeMapId;
      pageState.viewports = {
        ...pageState.viewports,
        [this.state.activeMapId]: {
          pan: { ...this.state.viewport.pan },
          zoom: this.state.viewport.zoom,
        },
      };
    } else {
      pageState.activeMapId = null;
    }

    try {
      this.storage.setItem(
        this.getPageStateStorageKey(),
        JSON.stringify(pageState),
      );
    } catch (err) {
      console.warn("[MapStore] Failed to persist map page state", err);
    }
  }

  restorePageState() {
    const pageState = this.readPageState();
    const nextMapId = pageState?.activeMapId ?? null;
    const nextViewport =
      nextMapId && pageState?.viewports[nextMapId]
        ? pageState.viewports[nextMapId]
        : DEFAULT_VIEWPORT;

    this.settings.isRestoringSettings = true;
    try {
      this.pendingActiveMapId = nextMapId;
      this.state.activeMapId = null;
      this.state.viewport = nextViewport;
      this.settings.applySettings(nextMapId);
    } finally {
      this.settings.isRestoringSettings = false;
    }
  }

  selectMap(id: string, pushToStack = false) {
    if (this.state.activeMapId === id) return;
    if (
      pushToStack &&
      this.state.activeMapId &&
      this.state.activeMapId !== id
    ) {
      this.state.navigationStack.push(this.state.activeMapId);
    }
    this.activateMap(id);
  }

  goBack() {
    const prevId = this.state.navigationStack.pop();
    if (prevId) this.activateMap(prevId);
  }

  private activateMap(id: string) {
    this.persistPageState();
    this.pendingActiveMapId = null;
    this.state.activeMapId = id;
    this.settings.applySettings(id);
    const pageState = this.readPageState();
    this.state.viewport = pageState?.viewports[id] ?? {
      pan: { x: 0, y: 0 },
      zoom: 1,
    };
    this.persistPageState();
  }

  updateViewport(pan: Point, zoom: number) {
    this.state.viewport = { pan, zoom };
    // Called on every pointermove while panning/dragging (including a map
    // being nudged under a fixed grid for fine-tuning) — persisting
    // synchronously here does a blocking localStorage read+write per frame,
    // which was dropping frames badly enough to look like the drag was
    // snapping to grid increments. Debounce it like schedulePersistSettings.
    this.schedulePersistPageState();
  }

  private schedulePersistPageState() {
    if (this._viewportPersistTimer !== null) {
      clearTimeout(this._viewportPersistTimer);
    }
    this._viewportPersistTimer = setTimeout(() => {
      this._viewportPersistTimer = null;
      this.persistPageState();
    }, 250);
  }
}
