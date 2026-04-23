import { base } from "$app/paths";
import type { ActivityEvent } from "$lib/types/activity";
import type {
  ConnectionDiscoveryMode,
  EntityDiscoveryMode,
} from "@codex/oracle-engine";

const ACTIVE_THEME_STORAGE_KEY = "codex-cryptica-active-theme";
const EXPLORER_COLLAPSED_LABELS_STORAGE_KEY =
  "codex_explorer_collapsed_label_groups";
const VTT_SIDEBAR_COLLAPSED_STORAGE_KEY = "codex_vtt_sidebar_collapsed";
const VTT_ENTITY_LIST_COLLAPSED_STORAGE_KEY = "codex_vtt_entity_list_collapsed";
const ENTITY_DISCOVERY_MODE_STORAGE_KEY = "codex_entity_discovery_mode";
const CONNECTION_DISCOVERY_MODE_STORAGE_KEY = "codex_connection_discovery_mode";

type ExplorerCollapsedLabelGroups = Record<string, string[]>;

function isEntityDiscoveryMode(
  value: string | null,
): value is EntityDiscoveryMode {
  return value === "off" || value === "suggest" || value === "auto-create";
}

function isConnectionDiscoveryMode(
  value: string | null,
): value is ConnectionDiscoveryMode {
  return value === "off" || value === "suggest" || value === "auto-apply";
}

export type SettingsTab =
  | "vault"
  | "intelligence"
  | "schema"
  | "theme"
  | "about"
  | "help";

export class UIStore {
  showSettings = $state(false);
  showCanvasSelector = $state(false);
  pendingCanvasEntities = $state<string[]>([]);
  activeSettingsTab = $state<SettingsTab>("vault");
  isImporting = $state(false);
  skipWelcomeScreen = $state(false);
  dismissedLandingPage = $state(false);
  dismissedWorldPage = $state(false);
  aiDisabled = $state(false);
  showDiceModal = $state(false);
  showChangelog = $state(false);
  lastSeenVersion = $state<string | null>(null);
  autoArchive = $state(false);
  entityDiscoveryMode = $state<EntityDiscoveryMode>("suggest");
  connectionDiscoveryMode = $state<ConnectionDiscoveryMode>("suggest");
  archiveActivityLog = $state<ActivityEvent[]>([]);
  explorerViewMode = $state<"list" | "label">("list");
  explorerCollapsedLabelGroups = $state<ExplorerCollapsedLabelGroups>({});

  // Sidebar State
  leftSidebarOpen = $state(false);
  activeSidebarTool = $state<"oracle" | "explorer" | "none">("none");
  leftSidebarWidth = $state(280);
  rightSidebarWidth = $state(380);

  // Main View State
  mainViewMode = $state<"visualization" | "focus">("visualization");
  focusedEntityId = $state<string | null>(null);

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
    persistent?: boolean;
  } | null>(null);

  private abortController: AbortController | null = null;
  private notificationTimeoutId: number | null = null;
  globalError = $state<{ message: string; stack?: string } | null>(null);

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("codex_skip_landing");
      if (saved !== null) {
        this.skipWelcomeScreen = saved === "true";
      }

      if (localStorage.getItem("codex_dismissed_landing") === "true") {
        this.dismissedLandingPage = true;
      }

      const worldPageDismissedAt = localStorage.getItem(
        "codex_world_page_dismissed_at",
      );
      if (worldPageDismissedAt !== null) {
        const dismissedAt = parseInt(worldPageDismissedAt, 10);
        const now = Date.now();
        if (Number.isNaN(dismissedAt) || dismissedAt > now) {
          localStorage.removeItem("codex_world_page_dismissed_at");
        } else if (now - dismissedAt < 24 * 60 * 60 * 1000) {
          this.dismissedWorldPage = true;
        }
      }

      const aiDisabled = localStorage.getItem("codex_ai_disabled");
      if (aiDisabled !== null) {
        this.aiDisabled = aiDisabled === "true";
      } else {
        // Migration from old lite_mode key
        const lite = localStorage.getItem("codex_lite_mode");
        if (lite !== null) {
          this.aiDisabled = lite === "true";
          localStorage.setItem("codex_ai_disabled", lite);
          localStorage.removeItem("codex_lite_mode");
        }
      }

      this.loadOracleAutomationSettings();

      this.lastSeenVersion = localStorage.getItem("codex_last_seen_version");

      const explorerMode = localStorage.getItem("codex_explorer_view_mode");
      if (explorerMode === "list" || explorerMode === "label") {
        this.explorerViewMode = explorerMode;
      }

      const collapsedLabelGroups = localStorage.getItem(
        EXPLORER_COLLAPSED_LABELS_STORAGE_KEY,
      );
      if (collapsedLabelGroups !== null) {
        try {
          const parsed = JSON.parse(collapsedLabelGroups);
          if (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed) &&
            Object.values(parsed).every(
              (value) =>
                Array.isArray(value) &&
                value.every((item) => typeof item === "string"),
            )
          ) {
            this.explorerCollapsedLabelGroups =
              parsed as ExplorerCollapsedLabelGroups;
          } else {
            throw new Error("Invalid format");
          }
        } catch {
          this.explorerCollapsedLabelGroups = {};
          localStorage.removeItem(EXPLORER_COLLAPSED_LABELS_STORAGE_KEY);
        }
      }

      const vttSidebarCollapsed = localStorage.getItem(
        VTT_SIDEBAR_COLLAPSED_STORAGE_KEY,
      );
      if (vttSidebarCollapsed !== null) {
        this.vttSidebarCollapsed = vttSidebarCollapsed === "true";
      }

      const vttEntityListCollapsed = localStorage.getItem(
        VTT_ENTITY_LIST_COLLAPSED_STORAGE_KEY,
      );
      if (vttEntityListCollapsed !== null) {
        this.vttEntityListCollapsed = vttEntityListCollapsed === "true";
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

  toggleSidebarTool(tool: "oracle" | "explorer" | "none") {
    if (tool === "none" || this.activeSidebarTool === tool) {
      this.leftSidebarOpen = false;
      this.activeSidebarTool = "none";
    } else {
      this.leftSidebarOpen = true;
      this.activeSidebarTool = tool;

      // If we're opening the explorer, close the canvas palette
      if (tool === "explorer") {
        this.showCanvasPalette = false;
      }
    }
  }

  focusEntity(entityId: string | null) {
    if (entityId) {
      // On mobile, close the sidebar when focusing an entity to ensure the view is visible.
      // We do this BEFORE the early return to ensure selecting an already-focused entity still closes the drawer.
      if (this.isMobile) {
        this.closeSidebar();
      }

      if (this.focusedEntityId === entityId && this.mainViewMode === "focus")
        return;

      this.focusedEntityId = entityId;
      this.mainViewMode = "focus";

      // Close the right-side entity sidebar if it was open (mutually exclusive with focus mode)
      void import("./vault.svelte").then((m) => {
        if (
          m?.vault &&
          this.mainViewMode === "focus" &&
          this.focusedEntityId === entityId
        ) {
          m.vault.selectedEntityId = null;
        }
      });
    } else {
      if (this.mainViewMode !== "focus") return;

      const previouslyFocused = this.focusedEntityId;
      this.focusedEntityId = null;
      this.mainViewMode = "visualization";

      // If we were looking at an entity, select it in the graph upon return
      if (previouslyFocused) {
        void import("./vault.svelte").then((m) => {
          if (m?.vault && this.mainViewMode === "visualization")
            m.vault.selectedEntityId = previouslyFocused;
        });
      }
    }
  }

  closeSidebar() {
    this.leftSidebarOpen = false;
    this.activeSidebarTool = "none";
  }

  setLeftSidebarWidth(width: number) {
    this.leftSidebarWidth = width;
    if (typeof window !== "undefined") {
      localStorage.setItem("codex_left_sidebar_width", width.toString());
    }
  }

  setRightSidebarWidth(width: number) {
    this.rightSidebarWidth = width;
    if (typeof window !== "undefined") {
      localStorage.setItem("codex_right_sidebar_width", width.toString());
    }
  }

  markVersionAsSeen(version: string) {
    this.lastSeenVersion = version;
    if (typeof window !== "undefined") {
      localStorage.setItem("codex_last_seen_version", version);
    }
  }

  toggleWelcomeScreen(skip: boolean) {
    this.skipWelcomeScreen = skip;
    localStorage.setItem("codex_skip_landing", String(skip));
  }

  dismissLandingPage() {
    this.dismissedLandingPage = true;
    localStorage.setItem("codex_dismissed_landing", "true");
  }

  dismissWorldPage() {
    this.dismissedWorldPage = true;
    localStorage.setItem("codex_world_page_dismissed_at", String(Date.now()));
  }

  restoreWorldPage() {
    this.dismissedWorldPage = false;
    localStorage.removeItem("codex_world_page_dismissed_at");
  }

  toggleAiDisabled(enabled: boolean) {
    this.aiDisabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("codex_ai_disabled", String(enabled));
    }
  }

  toggleAutoArchive(enabled: boolean) {
    this.setEntityDiscoveryMode(enabled ? "auto-create" : "suggest");
  }

  setEntityDiscoveryMode(mode: EntityDiscoveryMode) {
    this.entityDiscoveryMode = mode;
    this.autoArchive = mode === "auto-create";
    if (typeof window !== "undefined") {
      localStorage.setItem(ENTITY_DISCOVERY_MODE_STORAGE_KEY, mode);
      localStorage.setItem("codex_auto_archive", String(this.autoArchive));
    }
  }

  setConnectionDiscoveryMode(mode: ConnectionDiscoveryMode) {
    this.connectionDiscoveryMode = mode;
    if (typeof window !== "undefined") {
      localStorage.setItem(CONNECTION_DISCOVERY_MODE_STORAGE_KEY, mode);
    }
  }

  get oracleAutomationPolicy() {
    return {
      entityDiscovery: this.entityDiscoveryMode,
      connectionDiscovery: this.connectionDiscoveryMode,
    };
  }

  private loadOracleAutomationSettings() {
    const savedEntityMode = localStorage.getItem(
      ENTITY_DISCOVERY_MODE_STORAGE_KEY,
    );
    if (isEntityDiscoveryMode(savedEntityMode)) {
      this.entityDiscoveryMode = savedEntityMode;
      this.autoArchive = savedEntityMode === "auto-create";
    } else {
      const autoArchive = localStorage.getItem("codex_auto_archive");
      if (autoArchive !== null) {
        this.autoArchive = autoArchive === "true";
        this.entityDiscoveryMode = this.autoArchive ? "auto-create" : "suggest";
        localStorage.setItem(
          ENTITY_DISCOVERY_MODE_STORAGE_KEY,
          this.entityDiscoveryMode,
        );
      }
    }

    const savedConnectionMode = localStorage.getItem(
      CONNECTION_DISCOVERY_MODE_STORAGE_KEY,
    );
    if (isConnectionDiscoveryMode(savedConnectionMode)) {
      this.connectionDiscoveryMode = savedConnectionMode;
    }
  }

  setExplorerViewMode(mode: "list" | "label") {
    this.explorerViewMode = mode;
    if (typeof window !== "undefined") {
      localStorage.setItem("codex_explorer_view_mode", mode);
    }
  }

  getCollapsedLabelGroups(vaultId: string | null) {
    return new Set(
      this.explorerCollapsedLabelGroups[
        this.getExplorerLabelGroupScope(vaultId)
      ] ?? [],
    );
  }

  toggleExplorerLabelGroup(vaultId: string | null, label: string) {
    const scope = this.getExplorerLabelGroupScope(vaultId);
    const nextLabels = new Set(this.explorerCollapsedLabelGroups[scope] ?? []);

    if (nextLabels.has(label)) {
      nextLabels.delete(label);
    } else {
      nextLabels.add(label);
    }

    const nextState = { ...this.explorerCollapsedLabelGroups };
    if (nextLabels.size === 0) {
      delete nextState[scope];
    } else {
      nextState[scope] = Array.from(nextLabels).sort((a, b) =>
        a.localeCompare(b),
      );
    }

    this.explorerCollapsedLabelGroups = nextState;
    this.persistCollapsedLabelGroups();
  }

  private getExplorerLabelGroupScope(vaultId: string | null) {
    return vaultId ?? "__default__";
  }

  private persistCollapsedLabelGroups() {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        EXPLORER_COLLAPSED_LABELS_STORAGE_KEY,
        JSON.stringify(this.explorerCollapsedLabelGroups),
      );
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
  vttSidebarCollapsed = $state(false);
  vttEntityListCollapsed = $state(false);

  setGuestUsername(username: string) {
    this.guestUsername = username;
  }

  // Connection Label State
  lastConnectionLabel = $state("");
  recentConnectionLabels = $state<string[]>([]);
  showSelectionConnector = $state(false);

  // Canvas Palette State
  private _showCanvasPalette = $state(true);
  get showCanvasPalette() {
    return this._showCanvasPalette;
  }
  set showCanvasPalette(value: boolean) {
    this._showCanvasPalette = value;
    if (value && this.activeSidebarTool === "explorer") {
      this.closeSidebar();
    }
  }

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

  // Lightbox State
  lightbox = $state<{
    show: boolean;
    imageUrl: string;
    title: string;
  }>({
    show: false,
    imageUrl: "",
    title: "",
  });

  openLightbox(imageUrl: string, title: string) {
    this.lightbox = {
      show: true,
      imageUrl,
      title,
    };
  }

  closeLightbox() {
    this.lightbox.show = false;
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

  // Confirmation Dialog State
  confirmationDialog = $state<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
    resolve: ((result: boolean) => void) | null;
  }>({
    open: false,
    title: "",
    message: "",
    resolve: null,
  });

  async confirm(options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
  }): Promise<boolean> {
    if (this.confirmationDialog.open) {
      return false;
    }

    this.confirmationDialog = {
      open: true,
      ...options,
      resolve: null,
    };

    return new Promise<boolean>((resolve) => {
      this.confirmationDialog.resolve = resolve;
    });
  }

  resolveConfirmation(result: boolean) {
    if (this.confirmationDialog.resolve) {
      this.confirmationDialog.resolve(result);
    }
    this.confirmationDialog = {
      open: false,
      title: "",
      message: "",
      resolve: null,
    };
  }

  setGlobalError(message: string, stack?: string) {
    this.globalError = { message, stack };
  }

  clearGlobalError() {
    this.globalError = null;
  }

  notify(
    message: string,
    type: "success" | "info" | "error" = "success",
    persistent = false,
  ) {
    if (this.notificationTimeoutId !== null) {
      clearTimeout(this.notificationTimeoutId);
      this.notificationTimeoutId = null;
    }

    this.notification = { message, type, persistent };
    if (!persistent) {
      this.notificationTimeoutId = window.setTimeout(() => {
        this.notification = null;
        this.notificationTimeoutId = null;
      }, 5000);
    }
  }

  clearNotification() {
    if (this.notificationTimeoutId !== null) {
      clearTimeout(this.notificationTimeoutId);
      this.notificationTimeoutId = null;
    }
    this.notification = null;
  }

  toggleVttSidebar(collapsed: boolean) {
    this.vttSidebarCollapsed = collapsed;
    if (typeof window !== "undefined") {
      localStorage.setItem(
        VTT_SIDEBAR_COLLAPSED_STORAGE_KEY,
        String(collapsed),
      );
    }
  }

  toggleVttEntityList(collapsed: boolean) {
    this.vttEntityListCollapsed = collapsed;
    if (typeof window !== "undefined") {
      localStorage.setItem(
        VTT_ENTITY_LIST_COLLAPSED_STORAGE_KEY,
        String(collapsed),
      );
    }
  }

  openCanvasSelection(pendingEntities: string[] = []) {
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

  openDiceWindow() {
    if (typeof window === "undefined") return;

    const width = 450;
    const height = 800;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const params = new URLSearchParams();
    const activeTheme = window.localStorage.getItem(ACTIVE_THEME_STORAGE_KEY);
    if (activeTheme) {
      params.set("theme", activeTheme);
    }

    const query = params.toString();
    const url = `${window.location.origin}${base}/dice${query ? `?${query}` : ""}`;
    const features = `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0,noopener,noreferrer`;

    const newWin = window.open(url, "CodexCrypticaDice", features);
    if (newWin) newWin.opener = null;
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
    if (typeof window !== "undefined") {
      void import("./vault.svelte").then(({ vault }) => {
        const entity = vault.entities?.[entityId];
        if (vault.isGuest && !entity?.content) {
          void vault.loadEntityContent(entityId);
        }
      });
    }
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
