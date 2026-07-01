export type SettingsTab =
  | "vault"
  | "intelligence"
  | "schema"
  | "theme"
  | "publishing"
  | "about"
  | "help";

export type ImagePromptReviewTarget =
  | { kind: "entity"; id: string; title: string }
  | { kind: "message"; id: string; title: string; entityId?: string };

export class ModalUIStore {
  showSettings = $state(false);
  activeSettingsTab = $state<SettingsTab>("vault");
  showCanvasSelector = $state(false);
  pendingCanvasEntities = $state<string[]>([]);
  isImporting = $state(false);
  showDiceModal = $state(false);

  // Set to signal that the entity-creation form should open. A latching flag
  // (not a counter) because on mobile VaultControls mounts only after the
  // drawer opens, so it must be able to consume a request raised pre-mount.
  pendingCreateEntity = $state(false);
  // Optional date to pre-fill start_date when pendingCreateEntity is raised
  // from a calendar double-click. Cleared when the flag is consumed.
  pendingCreateDate = $state<{
    year: number;
    month: number;
    day: number;
  } | null>(null);

  // Mobile-only bottom sheet for creating entities
  showMobileCreateSheet = $state(false);

  showZenMode = $state(false);
  zenModeEntityId = $state<string | null>(null);
  zenModeActiveTab = $state<"overview" | "map" | "chats" | "timeline">(
    "overview",
  );

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
    imagePath?: string;
  }>({
    show: false,
    imageUrl: "",
    originRect: null,
    imagePath: "",
  });

  soundBite = $state<{
    show: boolean;
    entityId: string | null;
  }>({
    show: false,
    entityId: null,
  });

  relatedEntityDialog = $state<{
    open: boolean;
    sourceEntityId: string | null;
  }>({
    open: false,
    sourceEntityId: null,
  });

  vaultThemePrompt = $state<{
    open: boolean;
    vaultId: string | null;
  }>({
    open: false,
    vaultId: null,
  });

  showVaultSwitcher = $state(false);
  vaultSwitcherIntent = $state<"create" | "open" | null>(null);
  showShare = $state(false);

  imagePromptReview = $state<{
    open: boolean;
    target: ImagePromptReviewTarget | null;
    prompt: string;
  }>({
    open: false,
    target: null,
    prompt: "",
  });

  revisionDialog = $state<{
    open: boolean;
    entityId: string | null;
    instructions: string;
  }>({
    open: false,
    entityId: null,
    instructions: "",
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
    imagePath?: string,
  ) {
    this.lightbox = {
      show: true,
      imageUrl,
      title,
      originRect: originRect ?? null,
      imagePath: imagePath ?? "",
    };
  }

  closeLightbox() {
    this.lightbox.show = false;
    this.lightbox.originRect = null;
    this.lightbox.imagePath = "";
  }

  openSoundBite(entityId: string) {
    this.soundBite = { show: true, entityId };
  }

  closeSoundBite() {
    this.soundBite = { show: false, entityId: null };
  }

  openRelatedEntityDialog(sourceEntityId: string) {
    this.relatedEntityDialog = { open: true, sourceEntityId };
  }

  closeRelatedEntityDialog() {
    this.relatedEntityDialog = { open: false, sourceEntityId: null };
  }

  openVaultThemePrompt(vaultId: string) {
    this.vaultThemePrompt = { open: true, vaultId };
  }

  closeVaultThemePrompt() {
    this.vaultThemePrompt = { open: false, vaultId: null };
  }

  // In-app RPG generator workflow (see specs/131-in-app-rpg-generators).
  generatorWorkflow = $state<{
    open: boolean;
    launchMode: "workspace" | "contextual";
    sourceEntityId: string | null;
    generatorId: string | null;
    prefillDate?: { year: number; month: number; day: number } | null;
  }>({
    open: false,
    launchMode: "workspace",
    sourceEntityId: null,
    generatorId: null,
    prefillDate: null,
  });

  /** Open the unified generator workflow from the campaign workspace. */
  openGeneratorWorkflow(
    generatorId: string | null = null,
    prefillDate: { year: number; month: number; day: number } | null = null,
  ) {
    this.generatorWorkflow = {
      open: true,
      launchMode: "workspace",
      sourceEntityId: null,
      generatorId,
      prefillDate,
    };
  }

  /** Open the unified generator workflow seeded from a source entity. */
  openGeneratorWorkflowForEntity(
    sourceEntityId: string,
    generatorId: string | null = null,
  ) {
    this.generatorWorkflow = {
      open: true,
      launchMode: "contextual",
      sourceEntityId,
      generatorId,
      prefillDate: null,
    };
  }

  closeGeneratorWorkflow() {
    this.generatorWorkflow = {
      open: false,
      launchMode: "workspace",
      sourceEntityId: null,
      generatorId: null,
      prefillDate: null,
    };
  }

  requestCreateEntity(
    date?: { year: number; month: number; day: number } | null,
  ) {
    this.pendingCreateDate = date ?? null;
    this.pendingCreateEntity = true;
  }

  openVaultSwitcher(intent: "create" | "open" | null = null) {
    this.vaultSwitcherIntent = intent;
    this.showVaultSwitcher = true;
  }

  closeVaultSwitcher() {
    this.showVaultSwitcher = false;
    this.vaultSwitcherIntent = null;
  }

  openShare() {
    this.showShare = true;
  }

  closeShare() {
    this.showShare = false;
  }

  openImagePromptReview(target: ImagePromptReviewTarget, prompt: string) {
    this.imagePromptReview = {
      open: true,
      target,
      prompt,
    };
  }

  closeImagePromptReview() {
    this.imagePromptReview = {
      open: false,
      target: null,
      prompt: "",
    };
  }

  openRevisionDialog(entityId: string) {
    this.revisionDialog = {
      open: true,
      entityId,
      instructions: "",
    };
  }

  closeRevisionDialog() {
    this.revisionDialog = {
      open: false,
      entityId: null,
      instructions: "",
    };
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
    tab: "overview" | "map" | "chats" | "timeline" = "overview",
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

  get isAnyModalOpen() {
    return (
      this.showMobileCreateSheet ||
      this.showSettings ||
      this.showZenMode ||
      this.showDiceModal ||
      this.showCanvasSelector ||
      this.mergeDialog.open ||
      this.bulkLabelDialog.open ||
      this.relatedEntityDialog.open ||
      this.vaultThemePrompt.open ||
      this.showVaultSwitcher ||
      this.showShare ||
      this.imagePromptReview.open ||
      this.lightbox.show ||
      this.soundBite.show ||
      this.revisionDialog.open
    );
  }
}

// The version suffix must be bumped whenever the shape of ModalUIStore changes
// (new $state fields added/removed). This ensures Vite HMR never serves a
// cached instance that predates the current class definition — which would
// cause new properties to be undefined and their reactive assignments to be
// silently dropped.
const KEY = "__codex_modal_ui_store__v10__";
export const modalUIStore: ModalUIStore =
  (globalThis as any)[KEY] ?? ((globalThis as any)[KEY] = new ModalUIStore());
