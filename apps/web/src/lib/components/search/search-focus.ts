export const SEARCH_ENTITY_FOCUS_EVENT = "codex-search-entity-focus";
export const DEFAULT_SEARCH_ENTITY_ZOOM = 2;

export type SearchResultEntityRef = {
  id?: string | null;
  path?: string | null;
};

export function resolveSearchResultEntityId(result: SearchResultEntityRef) {
  if (result.id) return result.id;
  if (!result.path) return null;

  const pathSegments = result.path.split("/");
  const basename = pathSegments[pathSegments.length - 1] || result.path;
  const derivedId = basename.replace(/\.md$/, "");
  return derivedId || null;
}

export function dispatchSearchEntityFocus(
  entityId: string,
  zoom = DEFAULT_SEARCH_ENTITY_ZOOM,
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(SEARCH_ENTITY_FOCUS_EVENT, {
      detail: { entityId, zoom },
    }),
  );
}
