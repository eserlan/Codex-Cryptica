export const ENTITY_EXPLORER_PAGE_SIZE = 100;

export function getExplorerPageCount(
  totalCount: number,
  pageSize = ENTITY_EXPLORER_PAGE_SIZE,
) {
  return totalCount <= 0 || pageSize <= 0
    ? 1
    : Math.ceil(totalCount / pageSize);
}

export function getExplorerPageItems<T>(
  items: readonly T[],
  page: number,
  pageSize = ENTITY_EXPLORER_PAGE_SIZE,
) {
  if (pageSize <= 0) return [];
  return items.slice(
    Math.max(0, page - 1) * pageSize,
    Math.max(0, page - 1) * pageSize + pageSize,
  );
}

export function clampExplorerPage(
  page: number,
  totalCount: number,
  pageSize = ENTITY_EXPLORER_PAGE_SIZE,
) {
  return Math.min(
    Math.max(1, page),
    getExplorerPageCount(totalCount, pageSize),
  );
}
