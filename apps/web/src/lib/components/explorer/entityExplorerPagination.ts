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

export interface ExplorerGroupEntry {
  kind: "group" | "entity";
  groupKey: string;
}

/** Keep group headers attached when a large group crosses a page boundary. */
export function paginateExplorerGroups<T extends ExplorerGroupEntry>(
  entries: readonly T[],
  pageSize = ENTITY_EXPLORER_PAGE_SIZE,
): T[][] {
  if (pageSize <= 1)
    return entries.length ? entries.map((entry) => [entry]) : [];
  const pages: T[][] = [];
  let page: T[] = [];

  for (let index = 0; index < entries.length;) {
    const first = entries[index];
    if (first.kind !== "group") {
      if (page.length >= pageSize) {
        pages.push(page);
        page = [];
      }
      page.push(first);
      index += 1;
      continue;
    }

    const group: T[] = [first];
    index += 1;
    while (
      index < entries.length &&
      entries[index].kind === "entity" &&
      entries[index].groupKey === first.groupKey
    ) {
      group.push(entries[index]);
      index += 1;
    }

    if (group.length <= pageSize) {
      if (page.length > 0 && page.length + group.length > pageSize) {
        pages.push(page);
        page = [];
      }
      page.push(...group);
      continue;
    }

    if (page.length > 0) {
      pages.push(page);
      page = [];
    }

    const entitiesPerPage = pageSize - 1;
    for (let offset = 0; offset < group.length - 1; offset += entitiesPerPage) {
      pages.push([
        first,
        ...group.slice(offset + 1, offset + 1 + entitiesPerPage),
      ]);
    }
  }

  if (page.length > 0) pages.push(page);
  return pages;
}
