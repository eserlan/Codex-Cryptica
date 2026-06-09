import { mapStore as defaultMapStore } from "$lib/stores/map.svelte";
import { mapSession as defaultMapSession } from "$lib/stores/map-session.svelte";
import { vault as defaultVault } from "$lib/stores/vault.svelte";
import { modalUIStore as defaultModalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { notificationStore as defaultNotificationStore } from "$lib/stores/ui/notification.svelte";
import { sessionModeStore as defaultSessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { layoutUIStore as defaultLayoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { shouldShowInitiativePanel } from "$lib/components/map/vtt-ui";
import type { SessionMode } from "../../../types/vtt";
import type { Entity, Point } from "schema";

export const VTT_ENTITY_TYPES = ["character", "creature", "item"];
const ENTITY_TRANSFER_TYPE = "application/codex-entity";

type MapPageMapStore = {
  activeMap: unknown;
  unproject(point: Point): Point;
  uploadMap(file: File, name: string): Promise<string | undefined>;
  addPin(entityId: string | undefined, coordinates: Point): unknown;
};

type MapPageSession = {
  vttEnabled: boolean;
  mode: SessionMode;
  selectedToken?: unknown;
  dragPreview?: { entityId: string } | null;
  clearDragPreview(): void;
  setDragPreview(preview: { entityId: string; x: number; y: number }): void;
  addToken(input: {
    name: string;
    entityId: string;
    imageUrl?: string;
    x: number;
    y: number;
  }): unknown;
  requestTokenAdd(input: {
    name: string;
    entityId: string;
    imageUrl?: string;
    x: number;
    y: number;
  }): unknown;
};

type MapPageVault = {
  activeVaultId?: string | null;
  entities: Record<string, Entity>;
  allEntities: Entity[];
};

type MapPageNotificationStore = {
  notify(message: string, type?: "success" | "info" | "error"): void;
};

type MapPageModalStore = {
  openShare(): void;
};

type MapPageSessionModeStore = {
  isGuestMode: boolean;
};

type MapPageLayoutStore = {
  vttChatSidebarCollapsed: boolean;
  toggleVttChatSidebar(collapsed: boolean): void;
};

export interface MapPageControllerDependencies {
  mapStore?: MapPageMapStore;
  mapSession?: MapPageSession;
  vault?: MapPageVault;
  modalUIStore?: MapPageModalStore;
  notificationStore?: MapPageNotificationStore;
  sessionModeStore?: MapPageSessionModeStore;
  layoutUIStore?: MapPageLayoutStore;
}

export class MapPageController {
  private mapStore: MapPageMapStore = defaultMapStore;
  private mapSession: MapPageSession = defaultMapSession;
  private vault: MapPageVault = defaultVault;
  private modalUIStore: MapPageModalStore = defaultModalUIStore;
  private notificationStore: MapPageNotificationStore =
    defaultNotificationStore;
  private sessionModeStore: MapPageSessionModeStore = defaultSessionModeStore;
  private layoutUIStore: MapPageLayoutStore = defaultLayoutUIStore;
  private activeVaultId: string | null | undefined;

  isDragging = $state(false);
  showUpload = $state(false);
  mapName = $state("");
  files = $state<FileList | null>(null);

  chatSidebarOffset = $derived(
    this.layoutUIStore.vttChatSidebarCollapsed ? "3rem" : "20rem",
  );
  showInitiativePanel = $derived(
    shouldShowInitiativePanel(this.mapSession.vttEnabled, this.mapSession.mode),
  );
  hasSelectedToken = $derived(Boolean(this.mapSession.selectedToken));
  vttEntityCount = $derived.by(
    () =>
      this.vault.allEntities.filter((entity) =>
        VTT_ENTITY_TYPES.includes(entity.type),
      ).length,
  );

  constructor(deps: MapPageControllerDependencies = {}) {
    this.mapStore = deps.mapStore ?? defaultMapStore;
    this.mapSession = deps.mapSession ?? defaultMapSession;
    this.vault = deps.vault ?? defaultVault;
    this.modalUIStore = deps.modalUIStore ?? defaultModalUIStore;
    this.notificationStore = deps.notificationStore ?? defaultNotificationStore;
    this.sessionModeStore = deps.sessionModeStore ?? defaultSessionModeStore;
    this.layoutUIStore = deps.layoutUIStore ?? defaultLayoutUIStore;
    this.activeVaultId = this.vault.activeVaultId;
  }

  syncActiveVault(activeVaultId: string | null | undefined) {
    if (this.activeVaultId === activeVaultId) return;
    this.activeVaultId = activeVaultId;
    this.cancelUpload();
  }

  setVttChatSidebarCollapsed(collapsed: boolean) {
    this.layoutUIStore.toggleVttChatSidebar(collapsed);
  }

  openShareModal() {
    this.modalUIStore.openShare();
  }

  handleEntityDragStart(event: DragEvent, entityId: string) {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(ENTITY_TRANSFER_TYPE, entityId);
    event.dataTransfer.effectAllowed = "copy";
    this.mapSession.clearDragPreview();
  }

  handleEntityDragEnd() {
    this.isDragging = false;
    this.mapSession.clearDragPreview();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;

    const dataTransfer = event.dataTransfer;
    if (!dataTransfer || !this.isEntityDrag(dataTransfer)) return;

    dataTransfer.dropEffect = "copy";
    if (!this.mapSession.vttEnabled) return;

    const entityId =
      dataTransfer.getData(ENTITY_TRANSFER_TYPE) ||
      this.mapSession.dragPreview?.entityId;
    if (!entityId) return;

    const mapCoords = this.eventToMapCoords(event);
    this.mapSession.setDragPreview({
      entityId,
      x: mapCoords.x,
      y: mapCoords.y,
    });
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const hasLeftTarget =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (!hasLeftTarget) return;

    this.isDragging = false;
    this.mapSession.clearDragPreview();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;

    const dataTransfer = event.dataTransfer;
    this.mapSession.clearDragPreview();
    if (!dataTransfer) return;

    if (this.isEntityDrag(dataTransfer)) {
      this.dropEntity(event, dataTransfer);
      return;
    }

    if (dataTransfer.files?.length > 0) {
      this.files = dataTransfer.files;
      this.showUpload = true;
    }
  }

  async handleUpload() {
    const file = this.files?.[0];
    if (!file) return;

    try {
      const result = await this.mapStore.uploadMap(
        file,
        this.mapName || file.name,
      );
      if (result === undefined) {
        this.notificationStore.notify(
          "Failed to upload map. Please ensure your vault is active.",
          "error",
        );
        return;
      }
      this.cancelUpload();
    } catch (err) {
      console.error("[MapPageController] Error during handleUpload:", err);
      this.notificationStore.notify(
        "An unexpected error occurred during upload.",
        "error",
      );
    }
  }

  cancelUpload() {
    this.showUpload = false;
    this.mapName = "";
    this.files = null;
    this.isDragging = false;
  }

  private dropEntity(event: DragEvent, dataTransfer: DataTransfer) {
    if (this.sessionModeStore.isGuestMode) {
      this.notificationStore.notify(
        "Guests cannot add map pins or tokens.",
        "info",
      );
      return;
    }

    const entityId = dataTransfer.getData(ENTITY_TRANSFER_TYPE);
    const entity = this.vault.entities[entityId];
    const activeMap = this.mapStore.activeMap;
    if (!entity || !activeMap) return;

    const mapCoords = this.eventToMapCoords(event);
    if (this.mapSession.vttEnabled) {
      if (!VTT_ENTITY_TYPES.includes(entity.type)) return;
      this.mapSession.addToken({
        name: entity.title,
        entityId: entity.id,
        imageUrl: entity.image,
        x: mapCoords.x,
        y: mapCoords.y,
      });
      return;
    }

    this.mapStore.addPin(entityId, mapCoords);
  }

  private eventToMapCoords(event: DragEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return this.mapStore.unproject({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  private isEntityDrag(dataTransfer: DataTransfer | null) {
    if (!dataTransfer) return false;
    return Array.from(dataTransfer.types).includes(ENTITY_TRANSFER_TYPE);
  }
}
