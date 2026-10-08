import type { StorageLike } from "$lib/utils/runtime-deps";

export const MAX_TABLE_PINS = 3;
export const pinsKey = (vaultId: string) => `codex-solo-table-pins:${vaultId}`;

export interface SoloTablePinsDeps {
  storage: StorageLike;
  vaultId(): string | null;
  /** The ids of the vault's random tables. */
  tableIds(): string[];
}

/**
 * The random tables pinned to the solo bar (Solo Play Loop, FR-010 to FR-013).
 * Per vault and on this device. Pins for tables that have been deleted are
 * hidden at once and dropped from storage on the next write.
 */
export class SoloTablePinsStore {
  /** Bumped on every write so components reading `pins` update. */
  private version = $state(0);
  private deps: SoloTablePinsDeps;

  constructor(deps: SoloTablePinsDeps) {
    this.deps = deps;
  }

  get pins(): string[] {
    void this.version;
    const existing = new Set(this.deps.tableIds());
    return this.stored().filter((id) => existing.has(id));
  }

  /** Pins a table. False when the list is full, the table is unknown, or it is already pinned. */
  pin(id: string): boolean {
    const current = this.pins;
    if (current.includes(id)) return false;
    if (current.length >= MAX_TABLE_PINS) return false;
    if (!this.deps.tableIds().includes(id)) return false;
    this.write([...current, id]);
    return true;
  }

  unpin(id: string): void {
    this.write(this.pins.filter((pinned) => pinned !== id));
  }

  private stored(): string[] {
    const vaultId = this.deps.vaultId();
    if (!vaultId) return [];
    try {
      const raw = this.deps.storage.getItem(pinsKey(vaultId));
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  }

  private write(ids: string[]): void {
    const vaultId = this.deps.vaultId();
    if (!vaultId) return;
    try {
      this.deps.storage.setItem(pinsKey(vaultId), JSON.stringify(ids));
    } catch (err) {
      console.warn("[SoloTablePins] Could not save the pins", err);
    }
    this.version += 1;
  }
}
