/**
 * Starter Constellation & Intent Generator Contract
 * Location: packages/generator-engine/src/starter-constellation-types.ts
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
   * Accepted from local/AI generation but NOT acted on when saving: the web
   * app always creates exactly one connection, sourceId → targetId. See
   * data-model.md for why a duplicated reverse connection is wrong here.
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
