import type { EpistemicStatus, SourceReference, Visibility } from "./schema";

export type AdventureJsonExcerptKind =
  | "premise"
  | "system"
  | "scene"
  | "location"
  | "encounter"
  | "actor"
  | "clue"
  | "item"
  | "rumour"
  | "secret";

export interface AdventureJsonExcerpt {
  id: string;
  kind: AdventureJsonExcerptKind;
  visibility: Visibility;
  epistemicStatus: EpistemicStatus;
  sourceRef?: SourceReference;
  text: string;
}

export interface AdventureJsonRetrievalFocus {
  sceneId?: string;
  locationId?: string;
  actorIds?: string[];
  maxCharacters?: number;
}

export interface AdventureJsonRetrievalResult {
  playerSafe: AdventureJsonExcerpt[];
  gmOnly: AdventureJsonExcerpt[];
  includedIds: string[];
  truncated: boolean;
  sceneFallback: boolean;
  /** True when maxCharacters cannot hold the focus scene's required JSON envelope. */
  invalidBudget: boolean;
}
