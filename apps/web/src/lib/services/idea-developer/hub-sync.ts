import {
  toHubDraft,
  type Development,
  type SessionEntity,
} from "generator-engine";
import {
  sessionHubStore,
  type SessionHubStore,
} from "$lib/stores/session-hub.svelte";

/**
 * Keeps one Session Hub draft per Idea Developer conversation (#3228).
 *
 * The hub is how the user's idea reaches other generators: they read reusable
 * drafts as context, so the idea travels through the hub and never through a
 * link (FR-014, FR-031). One responsibility: add, update, look up and remove
 * that draft.
 */
export class HubSync {
  constructor(
    private readonly hub: Pick<
      SessionHubStore,
      "entities" | "addEntity" | "updateEntity" | "removeEntity"
    > = sessionHubStore,
  ) {}

  /** Adds the conversation's draft and returns its id. */
  add(development: Development, ideaText: string): string {
    return this.hub.addEntity(toHubDraft(development, ideaText));
  }

  /** Updates the draft in place. Returns false if it is no longer there. */
  update(id: string, development: Development, ideaText: string): boolean {
    if (!this.exists(id)) return false;
    const draft = toHubDraft(development, ideaText);
    this.hub.updateEntity(id, {
      title: draft.title,
      summary: draft.summary,
      content: draft.content,
      labels: draft.labels,
    });
    return true;
  }

  remove(id: string): void {
    this.hub.removeEntity(id);
  }

  exists(id: string): boolean {
    return this.hub.entities.some((entity) => entity.id === id);
  }

  get(id: string): SessionEntity | undefined {
    return this.hub.entities.find((entity) => entity.id === id);
  }
}

export const hubSync = new HubSync();
