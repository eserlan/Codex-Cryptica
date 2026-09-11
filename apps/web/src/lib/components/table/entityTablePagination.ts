export const ENTITY_TABLE_PAGE_SIZE = 50;

export function getEntityTablePageCount(
  totalCount: number,
  pageSize = ENTITY_TABLE_PAGE_SIZE,
): number {
  if (totalCount <= 0 || pageSize <= 0) return 1;
  return Math.ceil(totalCount / pageSize);
}

export function getEntityTablePageItems<T>(
  items: readonly T[],
  page: number,
  pageSize = ENTITY_TABLE_PAGE_SIZE,
): T[] {
  if (pageSize <= 0) return [];
  const start = Math.max(0, page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function clampEntityTablePage(
  page: number,
  totalCount: number,
  pageSize = ENTITY_TABLE_PAGE_SIZE,
): number {
  return Math.min(
    Math.max(1, page),
    getEntityTablePageCount(totalCount, pageSize),
  );
}
