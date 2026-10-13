import {
  applySelection,
  detectTrigger,
  reconcile,
  suggest,
  type EntityLike,
  type Mention,
  type MentionSource,
  type MentionSuggestion,
  type Trigger,
} from "entity-mention-engine";

export interface MentionKeyResult {
  handled: boolean;
  text: string;
  caret: number;
}

/**
 * Composer state for `@` mentions (#4052). It owns the picker and the draft
 * mentions, but not the text: the caller passes the text in and applies any
 * returned text. This keeps the textarea and the Oracle send path separate.
 */
export class OracleMentionController {
  mentions = $state<Mention[]>([]);
  open = $state(false);
  loading = $state(false);
  suggestions = $state<MentionSuggestion[]>([]);
  activeIndex = $state(0);
  private trigger: Trigger | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private vaultId: string | undefined;

  /**
   * @param search Optional full-text search returning entity ids. Its hits are
   *   merged after the in-memory match, so a failed or slow search never hides
   *   title and alias matches.
   */
  constructor(
    private readonly getSource: () => MentionSource,
    private readonly search?: (query: string) => Promise<string[]>,
    private readonly debounceMs = 120,
  ) {}

  /** Call after every text change. `prev` is the text before this change. */
  handleInput(prev: string, next: string, caret: number): void {
    this.mentions = reconcile(prev, next, this.mentions);
    const trigger = detectTrigger(next, caret);
    this.trigger = trigger;
    if (!trigger) {
      this.close();
      return;
    }
    this.suggestions = suggest(trigger.query, this.getSource());
    this.activeIndex = 0;
    this.open = true;
    this.scheduleSearch(trigger.query);
  }

  /**
   * Drops draft mentions when the active Vault changes, so a mention from one
   * Vault can never be sent into another.
   */
  syncVault(vaultId: string | undefined): void {
    if (vaultId === this.vaultId) return;
    this.vaultId = vaultId;
    this.mentions = [];
    this.close();
  }

  /** Stops any pending search. Call when the composer is torn down. */
  destroy(): void {
    this.cancelSearch();
  }

  private scheduleSearch(query: string): void {
    this.cancelSearch();
    if (!this.search || !query.trim()) return;
    this.loading = true;
    this.searchTimer = setTimeout(
      () => void this.runSearch(query),
      this.debounceMs,
    );
  }

  private async runSearch(query: string): Promise<void> {
    this.searchTimer = null;
    const hits = await this.search?.(query).catch(() => [] as string[]);
    // The user may have moved on or dismissed the picker while we waited.
    if (this.trigger?.query !== query) return;
    this.loading = false;
    this.suggestions = suggest(query, this.getSource(), hits ?? []);
    this.activeIndex = Math.min(
      this.activeIndex,
      Math.max(this.suggestions.length - 1, 0),
    );
  }

  private cancelSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = null;
    this.loading = false;
  }

  /**
   * Handles keys while the picker is open. Returns `handled: false` when the
   * key belongs to something else (for example Enter sends the message).
   */
  handleKey(key: string, text: string, caret: number): MentionKeyResult {
    const unhandled = { handled: false, text, caret };
    if (!this.open) return unhandled;

    switch (key) {
      case "ArrowDown":
        this.moveHighlight(1);
        return { handled: true, text, caret };
      case "ArrowUp":
        this.moveHighlight(-1);
        return { handled: true, text, caret };
      case "Enter":
      case "Tab":
        return this.selectHighlighted(text, caret);
      case "Escape":
        this.close();
        return { handled: true, text, caret };
      default:
        return unhandled;
    }
  }

  private moveHighlight(step: number): void {
    const last = this.suggestions.length - 1;
    if (last < 0) return;
    this.activeIndex = Math.min(Math.max(this.activeIndex + step, 0), last);
  }

  private selectHighlighted(text: string, caret: number): MentionKeyResult {
    const unhandled = { handled: false, text, caret };
    const pick = this.suggestions[this.activeIndex];
    if (!pick || !this.trigger) return unhandled;
    const entity = this.getSource().getEntity(pick.entityId);
    if (!entity) return unhandled;

    const applied = applySelection(text, this.trigger, entity, this.mentions);
    this.mentions = applied.mentions;
    this.close();
    return { handled: true, text: applied.text, caret: applied.caret };
  }

  /**
   * Applies a candidate chosen from the disambiguation prompt to an ambiguous
   * `@name` span.
   */
  choose(
    text: string,
    span: { start: number; end: number; query: string },
    entity: EntityLike,
  ): { text: string; caret: number } {
    const applied = applySelection(text, span, entity, this.mentions);
    this.mentions = applied.mentions;
    return { text: applied.text, caret: applied.caret };
  }

  /** Returns the draft mentions and clears them. Call when a message is sent. */
  takeMentions(): Mention[] {
    const taken = this.mentions;
    this.mentions = [];
    this.close();
    return taken;
  }

  private close(): void {
    this.cancelSearch();
    this.open = false;
    this.suggestions = [];
    this.trigger = null;
  }
}
