import type { EntityDraft } from "./package";

export interface MappingRule {
  when: { sourceType?: string; pathPrefix?: string };
  thenType: string;
}

export interface MappingRuleSet {
  rules: MappingRule[];
  defaultType: string;
}

export const DEFAULT_MAPPING_RULES: MappingRuleSet = {
  rules: [],
  defaultType: "note",
};

export const DEFAULT_MAX_ASSET_BYTES = 25 * 1024 * 1024;
export const DEFAULT_ACCEPTED_VERSIONS = ["1.0"];

export interface MapResult {
  resolvedType: string;
  typeFallback: boolean;
}

export function mapDraftToType(
  draft: EntityDraft,
  rules: MappingRuleSet,
): MapResult {
  for (const rule of rules.rules) {
    if (
      rule.when.sourceType !== undefined &&
      draft.sourceType === rule.when.sourceType
    ) {
      return { resolvedType: rule.thenType, typeFallback: false };
    }
    if (
      rule.when.pathPrefix !== undefined &&
      draft.sourcePath !== undefined &&
      draft.sourcePath.startsWith(rule.when.pathPrefix)
    ) {
      return { resolvedType: rule.thenType, typeFallback: false };
    }
  }
  return { resolvedType: rules.defaultType, typeFallback: true };
}

export function mapDraftToFields(
  draft: EntityDraft,
  resolvedType: string,
  discoverySource: string,
): {
  type: string;
  title: string;
  content: string;
  lore?: string;
  tags: string[];
  labels: string[];
  image?: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
  parent?: string;
  discoverySource: string;
} {
  return {
    type: resolvedType,
    title: draft.title,
    content: draft.content ?? "",
    lore: draft.lore,
    tags: draft.tags ?? [],
    labels:
      draft.labels && draft.labels.length > 0
        ? draft.labels
        : (draft.tags ?? []),
    image: draft.image,
    thumbnail: draft.thumbnail,
    metadata: draft.metadata,
    parent: draft.parentRef,
    discoverySource,
  };
}
