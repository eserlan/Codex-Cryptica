import { resolveOracleProxyUrl } from "$lib/config/oracle-proxy";

/**
 * Operator vault inventory (spec 162, FR-024): metadata-only rows for the
 * `/admin/vaults` page. Mirrors `apps/workers/oracle-proxy/src/admin-vaults.ts`.
 */
export type VaultInventoryKind = "backups" | "published";

export interface VaultInventoryRow {
  id: string;
  title: string;
  sizeBytes: number;
  entityCount: number | null;
  createdAt: string | null;
  lastActiveAt: string | null;
  suspension?: "delist" | "disable" | null;
}

export interface VaultInventoryPage {
  vaults: VaultInventoryRow[];
  cursor: string | null;
}

export type VaultSortKey =
  "title" | "sizeBytes" | "entityCount" | "lastActiveAt";
export type SortDirection = "asc" | "desc";

export class VaultInventoryError extends Error {}

export class VaultInventoryService {
  constructor(
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
    private readonly baseUrl: string = resolveOracleProxyUrl(),
  ) {}

  async fetchPage(
    kind: VaultInventoryKind,
    token: string,
    cursor: string | null = null,
  ): Promise<VaultInventoryPage> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.baseUrl}/api/admin/vaults/${kind}${query}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {
      throw new VaultInventoryError("Could not reach the worker.");
    }
    if (!response.ok) {
      throw new VaultInventoryError(
        response.status === 404
          ? "Not found — wrong token, or the admin route isn't configured."
          : `Request failed (${response.status}).`,
      );
    }
    return (await response.json()) as VaultInventoryPage;
  }

  /** Follows cursors until the inventory is complete. */
  async fetchAll(
    kind: VaultInventoryKind,
    token: string,
    onPage?: (rows: VaultInventoryRow[]) => void,
  ): Promise<VaultInventoryRow[]> {
    const rows: VaultInventoryRow[] = [];
    let cursor: string | null = null;
    do {
      const page = await this.fetchPage(kind, token, cursor);
      rows.push(...page.vaults);
      onPage?.([...rows]);
      cursor = page.cursor;
    } while (cursor);
    return rows;
  }
}

/** Missing values sort last in either direction, so blanks never lead. */
export function sortVaults(
  rows: readonly VaultInventoryRow[],
  key: VaultSortKey,
  direction: SortDirection,
): VaultInventoryRow[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left === null || left === undefined) return right == null ? 0 : 1;
    if (right === null || right === undefined) return -1;
    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), undefined, {
            sensitivity: "base",
          });
    return order * sign;
  });
}

export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (bytes > 0 && mb < 0.01) return "<0.01 MB";
  return `${mb.toFixed(mb >= 100 ? 0 : 2)} MB`;
}

export function formatLastActive(
  iso: string | null,
  now: Date = new Date(),
): string {
  if (!iso) return "—";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  const date = then.toISOString().slice(0, 10);
  if (days <= 0) return `${date} (today)`;
  if (days === 1) return `${date} (yesterday)`;
  return `${date} (${days} days ago)`;
}

export function summarise(rows: readonly VaultInventoryRow[]) {
  return {
    count: rows.length,
    totalBytes: rows.reduce((sum, row) => sum + row.sizeBytes, 0),
    totalEntities: rows.reduce((sum, row) => sum + (row.entityCount ?? 0), 0),
  };
}
