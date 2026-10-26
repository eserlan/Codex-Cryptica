import {
  MAX_COMPARE,
  addAlteration as addAlterationToProfile,
  buildComparison,
  buildIllustrationPrompt,
  setReferenceLinks,
  BIOME_REFERENCE_LINKS_MAX,
  removeAlteration as removeAlterationFromProfile,
  suggestEffects,
  updateAlteration as updateAlterationInProfile,
  type AlterationInput,
  type BiomeAlteration,
  type SuggestRunner,
  type Suggestion,
  createBlankProfile,
  createProfileFromReference,
  getBiome,
  renderProfileMarkdown,
  renderReferenceMarkdown,
  setOwnClimate,
  setOwnField,
  validateForSave,
  type BiomeOwnFields,
  type BiomeProfile,
  type FilterFacet,
  type ValidationError,
  type ValidationWarning,
} from "biome-engine";
import type {
  BiomeEntitySummary,
  BiomeVaultGateway,
} from "#lib/services/biome/biome-vault-gateway.js";
import type { StorageLike } from "#lib/utils/runtime-deps.js";

/** The largest picture a user can attach to a biome. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const BIOME_VIEW_KEY = "codex-biome-explorer-view";

export type BiomeView = "library" | "compare" | "editor";
type RememberedView = Exclude<BiomeView, "editor">;
const REMEMBERED_VIEWS: readonly RememberedView[] = ["library", "compare"];

export interface BiomeDraft {
  /** Present once the profile has been saved to the vault. */
  entityId?: string;
  title: string;
  profile: BiomeProfile;
  /** True when something changed since the draft was started or last saved. */
  dirty: boolean;
}

export type SaveState = "idle" | "saving" | "failed";

/** Matches `HINT_KEYS.BIOME_AI_NOTICE` in the help configuration. */
export const BIOME_AI_NOTICE_KEY = "biome-ai-notice-seen";

export type SuggestionState =
  | { status: "loading" }
  | { status: "done"; items: Suggestion[] }
  | { status: "error"; message: string };

export interface BiomeExplorerDeps {
  storage: StorageLike;
  vault?: BiomeVaultGateway | null;
  /** Copies text to the clipboard. Returns false when that is not possible. */
  copyText: (text: string) => Promise<boolean>;
  isAiAllowed: () => boolean;
  /** The optional AI helper. Absent when AI cannot be used at all. */
  suggest?: SuggestRunner | null;
  /** True when a vault is open and can be written to (not a guest view). */
  isVaultWritable?: () => boolean;
  now: () => number;
  newId: () => string;
}

/**
 * State for the Biome Explorer: library search, comparison, and the biome being
 * made or edited. Nothing reaches the vault until `save()` is called.
 */
export class BiomeExplorerStore {
  view = $state<BiomeView>("library");
  query = $state("");
  filters = $state<FilterFacet[]>([]);
  compareIds = $state<string[]>([]);

  draft = $state<BiomeDraft | null>(null);
  errors = $state<ValidationError[]>([]);
  warnings = $state<ValidationWarning[]>([]);
  discardPending = $state(false);

  saveState = $state<SaveState>("idle");
  saveError = $state<string | null>(null);
  profiles = $state<BiomeEntitySummary[]>([]);
  /** A plain-language message about the last open or delete that failed. */
  openError = $state<string | null>(null);
  deletePendingId = $state<string | null>(null);
  /** Set when the clipboard could not be used, so the text can be shown. */
  copyFallbackText = $state<string | null>(null);

  /** AI proposals per alteration id. They are never applied on their own. */
  suggestions = $state<Record<string, SuggestionState>>({});
  aiNoticeSeen = $state(false);
  /** The user's own attached picture, as a displayable address ("" if none). */
  attachedImageUrl = $state("");
  attachError = $state<string | null>(null);

  protected readonly deps: BiomeExplorerDeps;
  private readonly suggestionControllers = new Map<string, AbortController>();
  private openTicket = 0;

  constructor(deps: BiomeExplorerDeps) {
    this.deps = deps;
    this.view = this.readRememberedView();
    try {
      this.aiNoticeSeen = deps.storage.getItem(BIOME_AI_NOTICE_KEY) === "1";
    } catch {
      this.aiNoticeSeen = false;
    }
  }

  // ----- views -----

  setView(view: RememberedView): void {
    this.view = view;
    try {
      this.deps.storage.setItem(BIOME_VIEW_KEY, view);
    } catch {
      // The preference is a convenience; the view still changes.
    }
  }

  private readRememberedView(): RememberedView {
    try {
      const stored = this.deps.storage.getItem(BIOME_VIEW_KEY);
      return REMEMBERED_VIEWS.find((view) => view === stored) ?? "library";
    } catch {
      return "library";
    }
  }

  // ----- comparison -----

  get compareFull(): boolean {
    return this.compareIds.length >= MAX_COMPARE;
  }

  get comparison() {
    return buildComparison(this.compareIds);
  }

  /** Adds or removes a biome. False when it is unknown or three are already chosen. */
  toggleCompare(biomeId: string): boolean {
    if (this.compareIds.includes(biomeId)) {
      this.compareIds = this.compareIds.filter((id) => id !== biomeId);
      return true;
    }
    if (!getBiome(biomeId) || this.compareFull) return false;
    this.compareIds = [...this.compareIds, biomeId];
    return true;
  }

  clearCompare(): void {
    this.compareIds = [];
  }

  // ----- drafts -----

  /** Starts a draft from a library biome. False if the biome is unknown. */
  startFromReference(biomeId: string): boolean {
    const biome = getBiome(biomeId);
    if (!biome) return false;
    this.beginDraft({
      title: "",
      profile: createProfileFromReference(biome, this.deps.now()),
      dirty: false,
    });
    return true;
  }

  startBlank(): void {
    this.beginDraft({ title: "", profile: createBlankProfile(), dirty: false });
  }

  private beginDraft(draft: BiomeDraft): void {
    this.openTicket++;
    this.draft = draft;
    this.errors = [];
    this.warnings = [];
    this.discardPending = false;
    this.saveState = "idle";
    this.saveError = null;
    this.suggestions = {};
    this.attachedImageUrl = "";
    this.attachError = null;
    this.view = "editor";
  }

  private change(update: (draft: BiomeDraft) => Partial<BiomeDraft>): void {
    if (!this.draft) return;
    this.draft = { ...this.draft, ...update(this.draft), dirty: true };
  }

  setTitle(title: string): void {
    this.change(() => ({ title }));
    this.errors = this.errors.filter((e) => e.field !== "title");
  }

  editOwn(
    field: Exclude<keyof BiomeOwnFields, "climate">,
    value: string,
  ): void {
    this.change((d) => ({ profile: setOwnField(d.profile, field, value) }));
  }

  editClimate(patch: Partial<BiomeOwnFields["climate"]>): void {
    this.change((d) => ({ profile: setOwnClimate(d.profile, patch) }));
  }

  /**
   * Leaves the draft. A draft with unsaved changes needs `confirmed = true`;
   * without it the draft is kept, `discardPending` is set and false is returned.
   */
  discardDraft(confirmed = false): boolean {
    if (!this.draft) return true;
    if (this.draft.dirty && !confirmed) {
      this.discardPending = true;
      return false;
    }
    this.draft = null;
    this.errors = [];
    this.warnings = [];
    this.discardPending = false;
    this.attachedImageUrl = "";
    this.attachError = null;
    this.view = "library";
    return true;
  }

  cancelDiscard(): void {
    this.discardPending = false;
  }

  // ----- fictional alterations -----

  addAlteration(input: AlterationInput): string | null {
    if (!this.draft) return null;
    const id = this.deps.newId();
    try {
      this.change((d) => ({
        profile: addAlterationToProfile(d.profile, input, id),
      }));
    } catch {
      return null;
    }
    return id;
  }

  updateAlteration(
    id: string,
    patch: Partial<Omit<BiomeAlteration, "id">>,
  ): void {
    this.change((d) => ({
      profile: updateAlterationInProfile(d.profile, id, patch),
    }));
  }

  removeAlteration(id: string): void {
    this.cancelSuggestions(id);
    this.change((d) => ({
      profile: removeAlterationFromProfile(d.profile, id),
    }));
    const { [id]: _removed, ...rest } = this.suggestions;
    this.suggestions = rest;
  }

  /** A gentle reminder for an alteration with no cause yet. Never blocks a save. */
  reminderFor(alterationId: string): string | null {
    const alteration = this.draft?.profile.alterations.find(
      (a) => a.id === alterationId,
    );
    return alteration &&
      alteration.description.trim() &&
      alteration.cause.trim().length === 0
      ? "Say what causes this change, and what follows from it, so it stays believable. You can save without it."
      : null;
  }

  // ----- optional AI suggestions -----

  get canSuggest(): boolean {
    return Boolean(this.deps.suggest) && this.deps.isAiAllowed();
  }

  dismissAiNotice(): void {
    this.aiNoticeSeen = true;
    try {
      this.deps.storage.setItem(BIOME_AI_NOTICE_KEY, "1");
    } catch {
      // The note is a convenience; it simply shows again next time.
    }
  }

  private profileSummary(): string {
    const draft = this.draft;
    if (!draft) return "";
    const own = draft.profile.own;
    const parts = [
      draft.profile.reference
        ? `Based on ${draft.profile.reference.name}.`
        : "A custom environment.",
      own.terrain && `Terrain: ${own.terrain}`,
      own.vegetation && `Plants: ${own.vegetation}`,
      own.water && `Water: ${own.water}`,
      own.pressures && `Pressures: ${own.pressures}`,
    ].filter(Boolean);
    return parts.join(" ").slice(0, 1200);
  }

  async requestSuggestions(alterationId: string): Promise<void> {
    const alteration = this.draft?.profile.alterations.find(
      (a) => a.id === alterationId,
    );
    const run = this.deps.suggest;
    if (!alteration || !run) return;
    this.cancelSuggestions(alterationId);
    const controller = new AbortController();
    this.suggestionControllers.set(alterationId, controller);
    this.suggestions = {
      ...this.suggestions,
      [alterationId]: { status: "loading" },
    };

    const result = await suggestEffects(
      { run, isAllowed: () => this.deps.isAiAllowed() },
      {
        profileSummary: this.profileSummary(),
        alteration: $state.snapshot(alteration) as BiomeAlteration,
      },
      controller.signal,
    );
    if (this.suggestionControllers.get(alterationId) !== controller) return;
    this.suggestionControllers.delete(alterationId);

    const messages = {
      disabled: "The AI helper is turned off.",
      "invalid-response":
        "The AI helper gave an answer we couldn't use. Try again.",
      "runner-error":
        "The AI helper isn't available right now. You can write the effects yourself.",
      cancelled: "",
    } as const;
    if (result.ok) {
      this.suggestions = {
        ...this.suggestions,
        [alterationId]: { status: "done", items: result.suggestions },
      };
    } else if (result.reason === "cancelled") {
      const { [alterationId]: _gone, ...rest } = this.suggestions;
      this.suggestions = rest;
    } else {
      this.suggestions = {
        ...this.suggestions,
        [alterationId]: { status: "error", message: messages[result.reason] },
      };
    }
  }

  cancelSuggestions(alterationId: string): void {
    this.suggestionControllers.get(alterationId)?.abort();
    this.suggestionControllers.delete(alterationId);
    if (this.suggestions[alterationId]?.status === "loading") {
      const { [alterationId]: _stopped, ...rest } = this.suggestions;
      this.suggestions = rest;
    }
  }

  /** Adds one proposed effect to the alteration, as the user's own text. */
  acceptSuggestion(alterationId: string, index: number): void {
    const state = this.suggestions[alterationId];
    if (state?.status !== "done") return;
    const suggestion = state.items[index];
    const alteration = this.draft?.profile.alterations.find(
      (a) => a.id === alterationId,
    );
    if (!suggestion || !alteration) return;
    this.updateAlteration(alterationId, {
      effects: [...alteration.effects, suggestion.effect],
      aiAssisted: true,
    });
    this.dismissSuggestion(alterationId, index);
  }

  dismissSuggestion(alterationId: string, index: number): void {
    const state = this.suggestions[alterationId];
    if (state?.status !== "done") return;
    const items = state.items.filter((_, i) => i !== index);
    const { [alterationId]: _old, ...rest } = this.suggestions;
    this.suggestions =
      items.length > 0
        ? { ...rest, [alterationId]: { status: "done", items } }
        : rest;
  }

  // ----- saving -----

  /**
   * Saves the draft to the vault. Returns false, keeping the draft, when it
   * does not validate or the vault write fails.
   */
  async save(): Promise<boolean> {
    const draft = this.draft;
    if (!draft || this.saveState === "saving") return false;

    if (!this.vaultWritable || !this.deps.vault) {
      this.saveState = "failed";
      this.saveError =
        "Open a vault you can edit to save biomes. Your changes are still here, and you can copy them as Markdown.";
      return false;
    }

    const result = validateForSave(draft.title, draft.profile);
    if (!result.ok) {
      this.errors = result.errors;
      this.warnings = [];
      return false;
    }
    this.errors = [];
    this.warnings = result.warnings;

    const title = draft.title.trim();
    // The vault gets a plain copy, never Svelte's reactive proxy.
    const profile = $state.snapshot(draft.profile) as BiomeProfile;
    const content = renderProfileMarkdown(title, profile);
    this.saveState = "saving";
    this.saveError = null;
    try {
      let entityId = draft.entityId;
      if (entityId) {
        await this.deps.vault.update(entityId, title, profile, content);
      } else {
        entityId = await this.deps.vault.create(title, profile, content);
      }
      this.draft = { ...draft, title, entityId, dirty: false };
      this.saveState = "idle";
      return true;
    } catch {
      this.saveState = "failed";
      this.saveError =
        "We couldn't save this biome. Your changes are still here, so you can try again or copy them as Markdown.";
      return false;
    }
  }

  // ----- illustration prompt and links -----

  illustrationPromptText(): string {
    if (!this.draft) return "";
    return buildIllustrationPrompt(this.draft.profile, {
      name: this.draft.title,
    });
  }

  copyPrompt(): Promise<{ ok: boolean; text: string }> {
    return this.copy(this.illustrationPromptText());
  }

  keepPrompt(): void {
    const prompt = this.illustrationPromptText();
    this.change((d) => ({
      profile: { ...d.profile, illustrationPrompt: prompt },
    }));
  }

  dropPrompt(): void {
    this.change((d) => {
      const { illustrationPrompt: _dropped, ...rest } = d.profile;
      return { profile: rest };
    });
  }

  /** Adds a link. "invalid" for anything but https, "full" at ten links. */
  addReferenceLink(url: string, label: string): "ok" | "invalid" | "full" {
    if (!this.draft) return "invalid";
    const links = this.draft.profile.referenceLinks;
    if (links.length >= BIOME_REFERENCE_LINKS_MAX) return "full";
    const result = setReferenceLinks(this.draft.profile, [
      ...links,
      { url, label },
    ]);
    if (result.rejected.length > 0) return "invalid";
    this.change(() => ({ profile: result.profile }));
    return "ok";
  }

  removeReferenceLink(index: number): void {
    this.change((d) => ({
      profile: {
        ...d.profile,
        referenceLinks: d.profile.referenceLinks.filter((_, i) => i !== index),
      },
    }));
  }

  // ----- the user's own picture -----

  private async refreshImage(): Promise<void> {
    const id = this.draft?.entityId;
    if (!id || !this.deps.vault) {
      this.attachedImageUrl = "";
      return;
    }
    let url: string;
    try {
      url = await this.deps.vault.imageUrl(id);
    } catch {
      url = "";
    }
    // Only show it if the same biome is still open.
    if (this.draft?.entityId === id) this.attachedImageUrl = url;
  }

  /** Attaches a picture to a saved biome. Library images are never copied here. */
  async attachImage(file: File): Promise<boolean> {
    const id = this.draft?.entityId;
    this.attachError = null;
    if (!id || !this.deps.vault) {
      this.attachError =
        "Save the biome first, then you can add a picture to it.";
      return false;
    }
    if (!file.type.startsWith("image/")) {
      this.attachError = "Choose an image file.";
      return false;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      this.attachError = "That picture is too large. Choose one under 10 MB.";
      return false;
    }
    try {
      await this.deps.vault.attachImage(id, file);
    } catch {
      this.attachError =
        "We couldn't save the picture, so the biome is unchanged. Please try again.";
      return false;
    }
    await this.refreshImage();
    return true;
  }

  async removeImage(): Promise<boolean> {
    const id = this.draft?.entityId;
    if (!id || !this.deps.vault) return false;
    this.attachError = null;
    try {
      await this.deps.vault.removeImage(id);
    } catch {
      this.attachError = "We couldn't remove the picture. Please try again.";
      return false;
    }
    this.attachedImageUrl = "";
    return true;
  }

  // ----- reopening, reusing and deleting -----

  get vaultWritable(): boolean {
    return Boolean(this.deps.vault && this.deps.isVaultWritable?.());
  }

  async refreshProfiles(): Promise<void> {
    if (!this.vaultWritable || !this.deps.vault) {
      this.profiles = [];
      return;
    }
    try {
      this.profiles = await this.deps.vault.list();
    } catch {
      this.profiles = [];
    }
  }

  /** Opens a saved profile for editing. False when it cannot be read. */
  async openProfile(entityId: string): Promise<boolean> {
    this.openError = null;
    if (!this.deps.vault) return false;
    const ticket = ++this.openTicket;
    try {
      const loaded = await this.deps.vault.load(entityId);
      // A newer open or a discard has happened meanwhile; this answer is stale.
      if (ticket !== this.openTicket) return false;
      if (loaded) {
        this.beginDraft({
          entityId,
          title: loaded.title,
          profile: loaded.profile,
          dirty: false,
        });
        await this.refreshImage();
        return true;
      }
    } catch {
      // Falls through to the message below.
    }
    this.openError =
      "We couldn't open that biome in the Explorer. It may have been removed, or it was saved in a way the Explorer can't read.";
    return false;
  }

  /** Starts a new unsaved draft from a saved profile. The original is untouched. */
  async duplicateProfile(entityId: string): Promise<boolean> {
    this.openError = null;
    if (!this.deps.vault) return false;
    try {
      const loaded = await this.deps.vault.load(entityId);
      if (loaded) {
        this.beginDraft({
          title: `${loaded.title} (copy)`,
          profile: structuredClone(loaded.profile),
          dirty: true,
        });
        return true;
      }
    } catch {
      // Falls through to the message below.
    }
    this.openError = "We couldn't make a copy of that biome.";
    return false;
  }

  requestDelete(entityId: string): void {
    this.deletePendingId = entityId;
  }

  cancelDelete(): void {
    this.deletePendingId = null;
  }

  async confirmDelete(): Promise<boolean> {
    const id = this.deletePendingId;
    if (!id || !this.deps.vault) return false;
    this.deletePendingId = null;
    try {
      await this.deps.vault.remove(id);
    } catch {
      this.openError =
        "We couldn't delete that biome, so it is still in your vault.";
      return false;
    }
    this.profiles = this.profiles.filter((profile) => profile.id !== id);
    if (this.draft?.entityId === id) this.draft = null;
    return true;
  }

  // ----- Markdown -----

  private draftTitle(): string {
    return this.draft?.title.trim() || "Untitled biome";
  }

  exportDraftMarkdown(): string {
    if (!this.draft) return "";
    return renderProfileMarkdown(this.draftTitle(), this.draft.profile);
  }

  markdownFilename(): string {
    const slug = this.draftTitle()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${slug || "biome"}.md`;
  }

  private async copy(text: string): Promise<{ ok: boolean; text: string }> {
    let ok: boolean;
    try {
      ok = await this.deps.copyText(text);
    } catch {
      ok = false;
    }
    this.copyFallbackText = ok ? null : text;
    return { ok, text };
  }

  copyMarkdown(): Promise<{ ok: boolean; text: string }> {
    return this.copy(this.exportDraftMarkdown());
  }

  /** Copies a saved profile as Markdown without opening it. */
  async copyProfileMarkdown(
    entityId: string,
  ): Promise<{ ok: boolean; text: string }> {
    if (!this.deps.vault) return { ok: false, text: "" };
    try {
      const loaded = await this.deps.vault.load(entityId);
      if (loaded) {
        return this.copy(renderProfileMarkdown(loaded.title, loaded.profile));
      }
    } catch {
      // Falls through to the message below.
    }
    this.openError = "We couldn't open that biome to copy it.";
    return { ok: false, text: "" };
  }

  async copyReferenceMarkdown(
    biomeId: string,
  ): Promise<{ ok: boolean; text: string }> {
    const biome = getBiome(biomeId);
    if (!biome) return { ok: false, text: "" };
    return this.copy(renderReferenceMarkdown(biome));
  }
}
