/** A mention tracked in the composer or stored on a message. */
export interface Mention {
  entityId: string;
  displayName: string;
  entityType: string;
  /** Character range of `@displayName` in the message text. */
  start: number;
  end: number;
}

export interface EntityLike {
  id: string;
  title: string;
  type?: string;
  aliases?: string[];
  summary?: string;
  content?: string;
  labels?: string[];
}

export interface MentionSuggestion {
  entityId: string;
  title: string;
  entityType: string;
  matchedAlias?: string;
  descriptor?: string;
  /** Shown when two suggestions share a title. */
  disambiguator?: string;
}

export type ResolveStatus =
  "resolved" | "ambiguous" | "unavailable" | "unmatched";

export interface ResolvedMention {
  status: ResolveStatus;
  entityId?: string;
  displayName: string;
  entityType?: string;
  /** Candidate ids when status is `ambiguous`. */
  candidates?: string[];
  start?: number;
  end?: number;
}

/** Injected access to the active Vault. The engine never reads storage itself. */
export interface MentionSource {
  getEntity(id: string): EntityLike | undefined;
  /** Existing Vault visibility rules, applied by the caller's adapter. */
  isVisible(entity: EntityLike): boolean;
  listCandidates(): Iterable<EntityLike>;
}

export interface Trigger {
  query: string;
  /** Index of the `@` character. */
  start: number;
  /** Caret position: the end of the query. */
  end: number;
}
