export type SettingsTab =
  | "vault"
  | "sync"
  | "intelligence"
  | "schema"
  | "aesthetics"
  | "about"
  | "help";

class UIStore {
  showSettings = $state(false);
  activeSettingsTab = $state<SettingsTab>("vault");
  isImporting = $state(false);
  skipWelcomeScreen = $state(false);
  dismissedLandingPage = $state(false);
  private abortController: AbortController | null = null;
  globalError = $state<{ message: string; stack?: string } | null>(null);

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("codex_skip_landing");
      if (saved !== null) {
        this.skipWelcomeScreen = saved === "true";
      }
    }
  }

  toggleWelcomeScreen(skip: boolean) {
    this.skipWelcomeScreen = skip;
    localStorage.setItem("codex_skip_landing", String(skip));
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

  // Zen Mode State
  showZenMode = $state(false);
  zenModeEntityId = $state<string | null>(null);

  // Fog of War State
  sharedMode = $state(false);

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

  openSettings(tab: SettingsTab = "vault") {
    this.activeSettingsTab = tab;
    this.showSettings = true;
  }

  closeSettings() {
    this.showSettings = false;
  }

  toggleSettings(tab: SettingsTab = "vault") {
    if (this.showSettings && this.activeSettingsTab === tab) {
      this.showSettings = false;
    } else {
      this.activeSettingsTab = tab;
      this.showSettings = true;
    }
  }

  openZenMode(entityId: string) {
    this.zenModeEntityId = entityId;
    this.showZenMode = true;
  }

  closeZenMode() {
    this.showZenMode = false;
    this.zenModeEntityId = null;
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

export const uiStore = new UIStore();
export const ui = uiStore;
