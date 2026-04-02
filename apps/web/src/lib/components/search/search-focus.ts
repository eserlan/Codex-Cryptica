export const SEARCH_ENTITY_FOCUS_EVENT = "codex-search-entity-focus";
export const DEFAULT_SEARCH_ENTITY_ZOOM = 2;

export type SearchResultEntityRef = {
  id?: string | null;
  path?: string | null;
};

type SearchEntityFocusDetail = {
  entityId: string;
  zoom: number;
  requestId: number;
};

let pendingSearchEntityFocus: SearchEntityFocusDetail | null = null;
let lastHandledSearchEntityFocusRequestId = 0;
let nextSearchEntityFocusRequestId = 0;

export function resolveSearchResultEntityId(result: SearchResultEntityRef) {
  if (result.id) return result.id;
  if (!result.path) return null;

  const pathSegments = result.path.split("/");
  const basename = pathSegments[pathSegments.length - 1] || result.path;
  const derivedId = basename.replace(/\.md$/, "");
  return derivedId || null;
}

export function markSearchEntityFocusHandled(requestId: number) {
  lastHandledSearchEntityFocusRequestId = Math.max(
    lastHandledSearchEntityFocusRequestId,
    requestId,
  );
}

export function consumePendingSearchEntityFocus() {
  if (
    pendingSearchEntityFocus &&
    pendingSearchEntityFocus.requestId <= lastHandledSearchEntityFocusRequestId
  ) {
    pendingSearchEntityFocus = null;
  }

  const detail = pendingSearchEntityFocus;
  pendingSearchEntityFocus = null;
  return detail
    ? {
        entityId: detail.entityId,
        zoom: detail.zoom,
      }
    : null;
}

export function dispatchSearchEntityFocus(
  entityId: string,
  zoom = DEFAULT_SEARCH_ENTITY_ZOOM,
) {
  const detail = {
    entityId,
    zoom,
    requestId: ++nextSearchEntityFocusRequestId,
  };

  pendingSearchEntityFocus = detail;

  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(SEARCH_ENTITY_FOCUS_EVENT, {
      detail,
    }),
  );
}
