import { entrySceneId } from "./entry-scene";
import { clampMaxCharacters } from "./retrieval-budget";
import { splitByVisibility } from "./retrieval-format";
import { selectExcerpts } from "./retrieval-selection";
import type {
  AdventureJsonRetrievalFocus,
  AdventureJsonRetrievalResult,
} from "./retrieval-types";
import type { AdventureJsonV1 } from "./schema";

export type {
  AdventureJsonExcerpt,
  AdventureJsonExcerptKind,
  AdventureJsonRetrievalFocus,
  AdventureJsonRetrievalResult,
} from "./retrieval-types";
export {
  adventureJsonRecordIds,
  adventureJsonHiddenRecordIds,
  adventureJsonGmOnlyText,
  authorisedPackageRevelationScope,
  createAdventureJsonHiddenIdMatcher,
  type AdventureJsonRevelationScope,
} from "./retrieval-privacy";
export { formatAdventureJsonExcerpts } from "./retrieval-format";

function resolveFocusScene(
  pkg: AdventureJsonV1,
  requested: string | undefined,
): string | undefined {
  return requested !== undefined && pkg.scenes.some((s) => s.id === requested)
    ? requested
    : entrySceneId(pkg);
}

/**
 * Pure, deterministic scene-context retrieval for Adventure JSON v1. Selects
 * the focus scene and the records tied to it, splits them by visibility and
 * keeps the serialised size within `maxCharacters`.
 */
export function retrieveAdventureJsonContext(
  pkg: AdventureJsonV1,
  focus: AdventureJsonRetrievalFocus,
): AdventureJsonRetrievalResult {
  const resolved = resolveFocusScene(pkg, focus.sceneId);
  const sceneFallback =
    focus.sceneId !== undefined && resolved !== focus.sceneId;

  if (resolved === undefined) {
    return {
      playerSafe: [],
      gmOnly: [],
      includedIds: [],
      truncated: false,
      sceneFallback,
      invalidBudget: false,
    };
  }

  const selection = selectExcerpts(
    pkg,
    focus,
    resolved,
    clampMaxCharacters(focus.maxCharacters),
  );
  const kept = selection.excerpts;

  return {
    ...splitByVisibility(kept),
    includedIds: [...new Set(kept.map((e) => e.id))],
    truncated: selection.truncated,
    sceneFallback,
    invalidBudget: selection.invalidBudget,
  };
}
