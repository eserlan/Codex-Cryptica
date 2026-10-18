/**
 * Public surface of each new per-feature UI store. The temporary `uiStore`
 * facade is a structural union of these interfaces; consumers migrated in
 * Phase 8 import the concrete store they need instead.
 *
 * These signatures are wire-compatible with the current `UIStore` methods —
 * no consumer (other than the deleted facade itself) should require a body
 * change when migrating from `uiStore.foo()` to `<feature>Store.foo()`.
 */
import type { UIPersistence } from "./UIPersistence";

// ----- Notification -----
export interface NotificationStore {
  notification: { message: string; type?: string; persistent?: boolean } | null;
  globalError: { message: string; stack?: string } | null;
  confirmationDialog: {
    open: boolean;
    title: string;
    message: string;
  };

  notify(
    message: string,
    options?: { type?: string; persistent?: boolean },
  ): void;
  clearNotification(): void;
  setGlobalError(message: string, stack?: string): void;
  clearGlobalError(): void;
  confirm(options: { title: string; message: string }): Promise<boolean>;
  resolveConfirmation(result: boolean): void;
}

// ----- Onboarding -----
export interface OnboardingStore {
  dismissedLandingPage: boolean;
  dismissedWorldPage: boolean;
  worldPageDismissedAt: number | null;
  skipWelcomeScreen: boolean;
  lastSeenVersion: string | null;
  showChangelog: boolean;
  readonly isLandingPageVisible: boolean;

  dismissLandingPage(): void;
  dismissWorldPage(): void;
  restoreWorldPage(): void;
  toggleWelcomeScreen(skip: boolean): void;
  markVersionAsSeen(version: string): void;
}

// ----- Session Mode -----
export interface SessionModeStore {
  isGuestMode: boolean;
  guestUsername: string | null;
  sharedMode: boolean;
  isDemoMode: boolean;
  activeDemoTheme: string | null;
  hasPromptedSave: boolean;
  wasConverted: boolean;
  isStaging: boolean;

  setGuestUsername(username: string): void;
}

// ----- Modal -----
export type SettingsTab =
  "vault" | "appearance" | "ai" | "import" | "export" | "about";

export interface ModalUIStore {
  showSettings: boolean;
  activeSettingsTab: SettingsTab;
  showCanvasSelector: boolean;
  pendingCanvasEntities: string[];
  showDiceModal: boolean;
  isImporting: boolean;
  mergeDialog: { open: boolean; sourceIds: string[] };
  bulkLabelDialog: { open: boolean; entityIds: string[] };
  lightbox: { open: boolean; imageUrl: string; title: string };
  showZenMode: boolean;
  zenModeEntityId: string | null;
  zenModeActiveTab: "overview" | "inventory" | "map";
  readModeNodeId: string | null;
  readonly showReadModal: boolean;

  openSettings(tab?: SettingsTab): void;
  closeSettings(): void;
  toggleSettings(tab?: SettingsTab): void;
  openCanvasSelection(pendingEntities?: string[]): void;
  closeCanvasSelection(): void;
  openDiceWindow(): void;
  openImportWindow(): void;
  openMergeDialog(sourceIds: string[]): void;
  closeMergeDialog(): void;
  openBulkLabelDialog(entityIds: string[]): void;
  closeBulkLabelDialog(): void;
  openLightbox(imageUrl: string, title: string): void;
  closeLightbox(): void;
  openZenMode(entityId: string, tab?: ModalUIStore["zenModeActiveTab"]): void;
  closeZenMode(): void;
  openReadMode(nodeId: string): void;
  closeReadMode(): void;
  openReadModal(entityId: string): void;
  closeReadModal(): void;
}

// ----- Explorer -----
export type ExplorerViewMode = "list" | "label";
export type ExplorerCollapsedLabelGroups = Record<string, string[]>;

export interface ExplorerUIStore {
  explorerViewMode: ExplorerViewMode;
  explorerCollapsedLabelGroups: ExplorerCollapsedLabelGroups;
  labelFilters: Set<string>;

  setExplorerViewMode(mode: ExplorerViewMode): void;
  toggleLabelFilter(label: string, isMulti?: boolean): void;
  removeLabelFilter(label: string): void;
  clearLabelFilters(): void;
  getCollapsedLabelGroups(vaultId: string | null): string[];
  toggleExplorerLabelGroup(vaultId: string | null, label: string): void;
}

// ----- Discovery Policy -----
export type EntityDiscoveryMode = "suggest" | "auto" | "off";
export type ConnectionDiscoveryMode = "suggest" | "auto" | "off";

export interface DiscoveryPolicyStore {
  aiDisabled: boolean;
  autoArchive: boolean;
  entityDiscoveryMode: EntityDiscoveryMode;
  connectionDiscoveryMode: ConnectionDiscoveryMode;
  archiveActivityLog: unknown[];
  readonly oracleAutomationPolicy: {
    autoArchive: boolean;
    entityDiscoveryMode: EntityDiscoveryMode;
    connectionDiscoveryMode: ConnectionDiscoveryMode;
  };

  toggleAiDisabled(enabled: boolean): void;
  toggleAutoArchive(enabled: boolean): void;
  setEntityDiscoveryMode(mode: EntityDiscoveryMode): void;
  setConnectionDiscoveryMode(mode: ConnectionDiscoveryMode): void;
}

// ----- Connection Mode -----
export interface ConnectionModeStore {
  isModifierPressed: boolean;
  isConnecting: boolean;
  connectingNodeId: string | null;
  lastConnectionLabel: string;
  recentConnectionLabels: string[];
  showSelectionConnector: boolean;
  readonly abortSignal: AbortSignal;

  toggleConnectMode(): void;
  startSelectionConnection(): void;
  setLastConnectionLabel(label: string): void;
  abortActiveOperations(): void;
}

// ----- Layout -----
export interface LayoutUIStore {
  leftSidebarOpen: boolean;
  activeSidebarTool: "oracle" | "explorer" | "ai-assessment" | "none";
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  mainViewMode: "visualization" | "focus";
  focusedEntityId: string | null;
  isMobile: boolean;
  vttSidebarCollapsed: boolean;
  vttEntityListCollapsed: boolean;
  findNodeCounter: number;

  toggleSidebarTool(tool: LayoutUIStore["activeSidebarTool"]): void;
  closeSidebar(): void;
  setLeftSidebarWidth(width: number): void;
  setRightSidebarWidth(width: number): void;
  toggleVttSidebar(collapsed: boolean): void;
  toggleVttEntityList(collapsed: boolean): void;
  findInGraph(): void;
}

// ----- Cross-cutting helper (not a store) -----
/**
 * Composes layout primitives without cross-store imports.
 * Replaces today's `uiStore.focusEntity(id)`.
 */
export type FocusEntityFn = (
  entityId: string | null,
  layout?: LayoutUIStore,
) => void;

// ----- Factory contracts (Phase 1 wires these up) -----
export type CreateStoreFn<TStore> = (persistence: UIPersistence) => TStore;
