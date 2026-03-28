import { base } from "$app/paths";

export type SettingsTab =
  | "vault"
  | "intelligence"
  | "schema"
  | "theme"
  | "about"
  | "help";

class UIStore {
  showSettings = $state(false);
  showCanvasSelector = $state(false);
  activeSettingsTab = $state<SettingsTab>("vault");
  isImporting = $state(false);
  skipWelcomeScreen = $state(false);
  dismissedLandingPage = $state(false);
  liteMode = $state(false);
  showDiceModal = $state(false);

  // Sidebar State
  leftSidebarOpen = $state(false);
  activeSidebarTool = $state<"oracle" | "none">("none");

  // Responsive State
  isMobile = $state(false);

  // Staging State
  isStaging = $state(false);

  // Demo Mode State
  isDemoMode = $state(false);
  activeDemoTheme = $state<string | null>(null);
  hasPromptedSave = $state(false);
  wasConverted = $state(false);

  notification = $state<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);

  private abortController: AbortController | null = null;
  globalError = $state<{ message: string; stack?: string } | null>(null);

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("codex_skip_landing");
      if (saved !== null) {
        this.skipWelcomeScreen = saved === "true";
      }

      const lite = localStorage.getItem("codex_lite_mode");
      if (lite !== null) {
        this.liteMode = lite === "true";
      }

      const lastLabel = localStorage.getItem("codex_last_connection_label");
      if (lastLabel !== null) {
        this.lastConnectionLabel = lastLabel;
      }

      const recentLabels = localStorage.getItem(
        "codex_recent_connection_labels",
      );
      if (recentLabels !== null) {
        try {
          const parsed = JSON.parse(recentLabels);
          if (
            Array.isArray(parsed) &&
            parsed.every((item) => typeof item === "string")
          ) {
            this.recentConnectionLabels = parsed;
          } else {
            throw new Error("Invalid format");
          }
        } catch {
          this.recentConnectionLabels = [];
          localStorage.removeItem("codex_recent_connection_labels");
        }
      }

      // Proactively dismiss landing page if a demo is requested via URL
      // This prevents the "flash" of the landing page before DemoService.startDemo runs.
      if (new URLSearchParams(window.location.search).has("demo")) {
        this.dismissedLandingPage = true;
      }

      // Initialize isMobile
      if (window.matchMedia) {
        const mql = window.matchMedia("(max-width: 768px)");
        this.isMobile = mql.matches;
        mql.addEventListener("change", (e) => {
          this.isMobile = e.matches;
        });
      }
    }
  }

  toggleSidebarTool(tool: "oracle" | "none") {
    if (tool === "none" || this.activeSidebarTool === tool) {
      this.leftSidebarOpen = false;
      this.activeSidebarTool = "none";
    } else {
      this.leftSidebarOpen = true;
      this.activeSidebarTool = tool;
    }
  }

  closeSidebar() {
    this.leftSidebarOpen = false;
    this.activeSidebarTool = "none";
  }

  toggleWelcomeScreen(skip: boolean) {
    this.skipWelcomeScreen = skip;
    localStorage.setItem("codex_skip_landing", String(skip));
  }

  toggleLiteMode(enabled: boolean) {
    this.liteMode = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("codex_lite_mode", String(enabled));
    }
  }

  setLastConnectionLabel(label: string) {
    this.lastConnectionLabel = label;
    if (typeof window !== "undefined") {
      localStorage.setItem("codex_last_connection_label", label);

      // Update recent labels
      const updated = [
        label,
        ...this.recentConnectionLabels.filter((l) => l !== label),
      ].slice(0, 5);
      this.recentConnectionLabels = updated;
      localStorage.setItem(
        "codex_recent_connection_labels",
        JSON.stringify(updated),
      );
    }
  }

  toggleConnectMode() {
    this.isConnecting = !this.isConnecting;
    if (!this.isConnecting) {
      this.connectingNodeId = null;
    }
  }

  startSelectionConnection() {
    this.showSelectionConnector = true;
  }

  get abortSignal() {
    if (!this.abortController || this.abortController.signal.aborted) {
      this.abortController = new AbortController();
    }
    return this.abortController.signal;
  }

  abortActiveOperations() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // Interaction Modifiers
  isModifierPressed = $state(false);
  isConnecting = $state(false);
  connectingNodeId = $state<string | null>(null);

  // Zen Mode State
  showZenMode = $state(false);
  zenModeEntityId = $state<string | null>(null);
  zenModeActiveTab = $state<"overview" | "inventory" | "map">("overview");

  // Fog of War State
  sharedMode = $state(false);

  // Guest Mode State
  isGuestMode = $state(false);
  guestUsername = $state<string | null>(null);

  setGuestUsername(username: string) {
    this.guestUsername = username;
  }

  // Connection Label State
  lastConnectionLabel = $state("");
  recentConnectionLabels = $state<string[]>([]);
  showSelectionConnector = $state(false);

  // Canvas Palette State
  showCanvasPalette = $state(true);

  // Find in Graph State
  findNodeCounter = $state(0);

  findInGraph() {
    this.findNodeCounter++;
  }

  // Merge Dialog State
  mergeDialog = $state<{
    open: boolean;
    sourceIds: string[];
  }>({ open: false, sourceIds: [] });

  openMergeDialog(sourceIds: string[]) {
    this.mergeDialog = { open: true, sourceIds };
  }

  closeMergeDialog() {
    this.mergeDialog = { open: false, sourceIds: [] };
  }

  // Bulk Label Dialog State
  bulkLabelDialog = $state<{
    open: boolean;
    entityIds: string[];
  }>({ open: false, entityIds: [] });

  openBulkLabelDialog(entityIds: string[]) {
    this.bulkLabelDialog = { open: true, entityIds };
  }

  closeBulkLabelDialog() {
    this.bulkLabelDialog = { open: false, entityIds: [] };
  }

  // Compatibility aliases (can be deprecated later)
  /** @deprecated Use zenModeEntityId */
  get readModeNodeId() {
    return this.zenModeEntityId;
  }
  set readModeNodeId(value: string | null) {
    this.zenModeEntityId = value;
  }
  /** @deprecated Use showZenMode */
  get showReadModal() {
    return this.showZenMode;
  }

  setGlobalError(message: string, stack?: string) {
    this.globalError = { message, stack };
  }

  clearGlobalError() {
    this.globalError = null;
  }

  notify(message: string, type: "success" | "info" | "error" = "success") {
    this.notification = { message, type };
    setTimeout(() => {
      this.notification = null;
    }, 5000);
  }

  openSettings(tab: SettingsTab = "vault") {
    this.activeSettingsTab = tab;
    this.showSettings = true;
  }

  closeSettings() {
    this.showSettings = false;
  }

  openImportWindow() {
    if (typeof window === "undefined") return;

    const width = 800;
    const height = 900;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const url = `${window.location.origin}${base}/import`;
    const features = `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0,noopener,noreferrer`;

    const newWin = window.open(url, "CodexCrypticaImport", features);
    if (newWin) newWin.opener = null;
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

  // Compatibility methods
  openReadModal(entityId: string) {
    this.openZenMode(entityId);
  }

  closeReadModal() {
    this.closeZenMode();
  }

  openReadMode(nodeId: string) {
    this.openZenMode(nodeId);
  }

  closeReadMode() {
    this.closeZenMode();
  }

  get isLandingPageVisible() {
    return !this.skipWelcomeScreen && !this.dismissedLandingPage;
  }
}

const UI_KEY = "__codex_ui_instance__";
export const uiStore: UIStore =
  (globalThis as any)[UI_KEY] ?? ((globalThis as any)[UI_KEY] = new UIStore());
export const ui = uiStore;

if (
  typeof window !== "undefined" &&
  (import.meta.env.DEV || (window as any).__E2E__)
) {
  (window as any).uiStore = uiStore;
  (window as any).ui = ui;
}
