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
