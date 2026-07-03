import type {
  EntityDraft,
  RelationshipDraft,
  AssetDraft,
  ImportWarning,
} from "./package";

export type ItemDecision = "include" | "ignore";
export type MatchDecision = "skip" | "create" | "update";

export interface PreviewItem {
  draft: EntityDraft;
  resolvedType: string;
  typeFallback: boolean;
  sourceRef: string;
  match: { entityId: string } | null;
  decision: ItemDecision;
  matchDecision?: MatchDecision;
}

export interface PreviewRelationship {
  draft: RelationshipDraft;
  status: "resolved" | "unresolved";
  reason?: string;
}

export interface PreviewAsset {
  draft: AssetDraft;
  eligible: boolean;
  skipReason?: string;
}

export interface CCImportSession {
  id: string;
  sourceSystem: string;
  sourceLabel: string;
  items: PreviewItem[];
  relationships: PreviewRelationship[];
  assets: PreviewAsset[];
  warnings: ImportWarning[];
}

export function setItemDecision(
  session: CCImportSession,
  draftRef: string,
  decision: ItemDecision,
): CCImportSession {
  return {
    ...session,
    items: session.items.map((item) =>
      item.draft.sourceId === draftRef || item.draft.sourcePath === draftRef
        ? { ...item, decision }
        : item,
    ),
  };
}

export function setMatchDecision(
  session: CCImportSession,
  draftRef: string,
  matchDecision: MatchDecision,
): CCImportSession {
  return {
    ...session,
    items: session.items.map((item) =>
      item.draft.sourceId === draftRef || item.draft.sourcePath === draftRef
        ? { ...item, matchDecision }
        : item,
    ),
  };
}

/**
 * Lets the user manually override a detected/fallback type before commit.
 * Clears typeFallback since the type is no longer a guess.
 */
export function setItemType(
  session: CCImportSession,
  draftRef: string,
  resolvedType: string,
): CCImportSession {
  return {
    ...session,
    items: session.items.map((item) =>
      item.draft.sourceId === draftRef || item.draft.sourcePath === draftRef
        ? { ...item, resolvedType, typeFallback: false }
        : item,
    ),
  };
}
