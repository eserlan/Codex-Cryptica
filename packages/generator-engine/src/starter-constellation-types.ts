/**
 * Starter Constellation & Intent Generator Contract
 *
 * Shapes for the Guided Mode / Quick Start experience (#1909). Framework-free:
 * this file only declares data shapes, no AI or storage access.
 */

export interface StarterConstellationConfig {
  themeId: string;
  premise?: string;
  useAI?: boolean;
}

export interface ConstellationEntity {
  id: string;
  title: string;
  type: "location" | "character" | "faction" | "event" | "item" | "threat";
  subtype: string;
  summary: string;
  content: string;
  labels: string[];
}

export interface ConstellationRelationship {
  sourceId: string;
  targetId: string;
  relation: string;
  /**
   * Accepted from local/AI generation but not acted on by the web app when
   * saving: exactly one connection (sourceId → targetId) is always created,
   * in the direction implied by `relation` (e.g. Settlement → located in →
   * Region). A single connection already renders as one graph edge —
   * creating the reverse direction too would draw a duplicate,
   * backwards-reading edge.
   */
  bidirectional?: boolean;
}

export interface StarterConstellationResult {
  themeId: string;
  title: string;
  summary: string;
  entities: ConstellationEntity[];
  relationships: ConstellationRelationship[];
}

export type IntentCategory =
  "character" | "place" | "faction" | "event" | "item" | "custom";

export interface IntentCreateOptions {
  category: IntentCategory;
  themeId: string;
  parentEntityId?: string;
  parentEntityTitle?: string;
  parentEntityType?: string;
  customPrompt?: string;
}

export interface ContextualRecommendation {
  id: string;
  parentEntityId: string;
  promptText: string;
  targetCategory: IntentCategory;
  relationType: string;
  actionLabel: string;
}

/** One slot in the starter constellation, for describing it before generating. */
export interface StarterConstellationSlot {
  /** The genre's word for this slot, e.g. "Sector" rather than "Region". */
  label: string;
  /** A representative name the generator can produce for this slot. */
  example: string;
}

/**
 * A description of what picking a given theme will actually produce, used to
 * show the user the consequences of the choice before they commit to it.
 *
 * The dropdown label and the generated genre are not the same words: the theme
 * "LCARS Interface" produces a Space Exploration world, "Ancient Parchment"
 * produces Classic Fantasy. Anything user-facing needs both names.
 */
export interface StarterConstellationPreview {
  themeId: string;
  /** Genre of the generated content, e.g. "Classic Fantasy". */
  genreName: string;
  /** One line on the genre's tone, reused from the generator's own flavor text. */
  flavor: string;
  /** The five entities a starter world always contains, in creation order. */
  slots: StarterConstellationSlot[];
}
