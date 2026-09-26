import {
  buildPromotion,
  type PromotionOptions,
  type PromotionScope,
  type SessionJournal,
} from "session-journal-engine";
import { vault } from "./vault.svelte";
import { quickNoteStore } from "./quicknote.svelte";
import { notificationStore } from "./ui/notification.svelte";

export interface DraftEntityData {
  status: "draft";
  content: string;
  discoverySource: string;
}

export interface SessionJournalPromoterDeps {
  createEntity: (
    type: string,
    title: string,
    data: DraftEntityData,
  ) => Promise<string>;
  openEntity: (entityId: string) => void;
  closePanel: () => void;
  /** Tells the user the draft exists. On a page with no entity panel the
   *  closing scratchpad would otherwise give no sign that anything happened. */
  notify?: (message: string) => void;
  log?: (message: string, error: unknown) => void;
}

export type PromoteResult =
  { ok: true; entityId: string } | { ok: false; error: string };

const MESSAGES = {
  needsName: "Please give it a name.",
  needsType: "Please choose a type.",
  failed: "That could not be made into an entity. Please try again.",
} as const;

/**
 * Session Journal (#3402 slice 4, #3409): turns part of a journal into a draft
 * vault entity, the same way Quicknote turns a note into one. The entity is a
 * draft with the text filled in and a back-reference, opened for the user to
 * edit, approve or discard; the journal itself is never touched (FR-041).
 *
 * The draft is opened and the panel closed only after the entity exists, so a
 * failure leaves the form and the journal exactly as they were (FR-045).
 */
export class SessionJournalPromoter {
  private readonly deps: SessionJournalPromoterDeps;
  private readonly log: (message: string, error: unknown) => void;

  constructor(deps: SessionJournalPromoterDeps) {
    this.deps = deps;
    this.log = deps.log ?? ((message, error) => console.error(message, error));
  }

  async promote(
    journal: SessionJournal,
    scope: PromotionScope,
    input: { type: string; title: string } & PromotionOptions,
  ): Promise<PromoteResult> {
    const title = input.title.trim();
    if (!title) return { ok: false, error: MESSAGES.needsName };
    const type = input.type.trim();
    if (!type) return { ok: false, error: MESSAGES.needsType };

    const built = buildPromotion(journal, scope, {
      formatTime: input.formatTime,
    });
    if (!built.ok) return { ok: false, error: built.error };

    let entityId: string;
    try {
      entityId = await this.deps.createEntity(type, title, {
        status: "draft",
        content: built.content,
        discoverySource: built.source,
      });
    } catch (error) {
      this.log("[SessionJournalPromoter] Could not create the entity:", error);
      return { ok: false, error: MESSAGES.failed };
    }

    // The draft exists now, so the promotion succeeded even if showing it
    // does not.
    this.attempt(() => this.deps.openEntity(entityId));
    this.attempt(() => this.deps.closePanel());
    this.attempt(() => this.deps.notify?.(`Created a draft: ${title}`));
    return { ok: true, entityId };
  }

  private attempt(step: () => void): void {
    try {
      step();
    } catch (error) {
      this.log("[SessionJournalPromoter] Could not show the draft:", error);
    }
  }
}

export const sessionJournalPromoter = new SessionJournalPromoter({
  createEntity: (type, title, data) => vault.createEntity(type, title, data),
  openEntity: (entityId) => {
    vault.selectedEntityId = entityId;
  },
  closePanel: () => quickNoteStore.close(),
  notify: (message) => notificationStore.notify(message, "success"),
});
