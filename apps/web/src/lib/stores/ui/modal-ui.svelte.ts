export type SettingsTab =
  | "vault"
  | "intelligence"
  | "schema"
  | "theme"
  | "about"
  | "help";

export class ModalUIStore {
  showSettings = $state(false);
  activeSettingsTab = $state<SettingsTab>("vault");
  showCanvasSelector = $state(false);
  pendingCanvasEntities = $state<string[]>([]);
  isImporting = $state(false);
  showDiceModal = $state(false);

  showZenMode = $state(false);
  zenModeEntityId = $state<string | null>(null);
  zenModeActiveTab = $state<"overview" | "inventory" | "map">("overview");

  mergeDialog = $state<{
    open: boolean;
    sourceIds: string[];
  }>({
    open: false,
    sourceIds: [],
  });

  bulkLabelDialog = $state<{
    open: boolean;
    entityIds: string[];
  }>({
    open: false,
    entityIds: [],
  });

  lightbox = $state<{
    show: boolean;
    imageUrl: string;
    title?: string;
    originRect?: { x: number; y: number; width: number; height: number } | null;
  }>({
    show: false,
    imageUrl: "",
    originRect: null,
  });

  // Derived properties for backwards compatibility
  get readModeNodeId() {
    return this.zenModeEntityId;
  }
  set readModeNodeId(value: string | null) {
    this.zenModeEntityId = value;
  }

  get showReadModal() {
    return this.showZenMode;
  }

  openMergeDialog(sourceIds: string[]) {
    this.mergeDialog = { open: true, sourceIds };
  }

  closeMergeDialog() {
    this.mergeDialog = { open: false, sourceIds: [] };
  }

  openBulkLabelDialog(entityIds: string[]) {
    this.bulkLabelDialog = { open: true, entityIds };
  }

  closeBulkLabelDialog() {
    this.bulkLabelDialog = { open: false, entityIds: [] };
  }

  openLightbox(
    imageUrl: string,
    title?: string,
    originRect?: { x: number; y: number; width: number; height: number } | null,
  ) {
    this.lightbox = {
      show: true,
      imageUrl,
      title,
      originRect: originRect ?? null,
    };
  }

  closeLightbox() {
    this.lightbox.show = false;
    this.lightbox.originRect = null;
  }

  openCanvasSelection(pendingEntities: string[]) {
    this.pendingCanvasEntities = pendingEntities;
    this.showCanvasSelector = true;
  }

  closeCanvasSelection() {
    this.showCanvasSelector = false;
    this.pendingCanvasEntities = [];
  }

  openSettings(tab: SettingsTab = "vault") {
    this.activeSettingsTab = tab;
    this.showSettings = true;
  }

  closeSettings() {
    this.showSettings = false;
  }

  closeDiceWindow() {
    this.showDiceModal = false;
  }

  toggleSettings(tab: SettingsTab = "vault") {
    if (this.showSettings && this.activeSettingsTab === tab) {
      this.showSettings = false;
    } else {
      this.activeSettingsTab = tab;
      this.showSettings = true;
    }
  }

  openZenMode(
    entityId: string,
    tab: "overview" | "inventory" | "map" = "overview",
  ) {
    this.zenModeEntityId = entityId;
    this.zenModeActiveTab = tab;
    this.showZenMode = true;
  }

  closeZenMode() {
    this.showZenMode = false;
    this.zenModeEntityId = null;
    this.zenModeActiveTab = "overview";
  }

  openReadMode(nodeId: string) {
    this.openZenMode(nodeId);
  }

  openReadModal(entityId: string) {
    this.openZenMode(entityId);
  }

  closeReadMode() {
    this.closeZenMode();
  }
}

const KEY = "__codex_modal_ui_store__";
export const modalUIStore: ModalUIStore =
  (globalThis as any)[KEY] ?? ((globalThis as any)[KEY] = new ModalUIStore());
