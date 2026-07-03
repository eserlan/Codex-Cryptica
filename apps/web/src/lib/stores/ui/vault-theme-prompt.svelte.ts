import { UIPersistence as DefaultPersistence } from "./persistence";

export type VaultThemePromptStatus = "not_shown" | "dismissed" | "applied";

export interface VaultThemePromptRecord {
  status: VaultThemePromptStatus;
  activeMs: number;
}

export interface VaultThemePromptPersistence {
  read<T>(key: string, parse: (raw: string) => T, fallback: T): T;
  write<T>(key: string, value: T, serialize?: (value: T) => string): void;
}

const STORAGE_KEY_PREFIX = "codex_vault_theme_prompt_";
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const THREE_ENTITIES = 3;
const SYNC_INTERVAL_MS = 15_000;

export class VaultThemePromptStore {
  private persistence: VaultThemePromptPersistence;
  private getNow: () => number;
  private syncIntervalMs: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private activeVaultIdInternal = $state<string | null>(null);
  private activeSessionStartedAt = $state<number | null>(null);
  private records = $state<Record<string, VaultThemePromptRecord>>({});

  constructor(
    persistence: VaultThemePromptPersistence = new DefaultPersistence(),
    getNow: () => number = Date.now,
    syncIntervalMs: number = SYNC_INTERVAL_MS,
  ) {
    this.persistence = persistence;
    this.getNow = getNow;
    this.syncIntervalMs = syncIntervalMs;
  }

  startTracking(vaultId: string) {
    if (!vaultId) return;

    if (this.activeVaultIdInternal && this.activeVaultIdInternal !== vaultId) {
      this.commitElapsedTime();
    }

    this.ensureRecordLoaded(vaultId);
    this.activeVaultIdInternal = vaultId;

    if (this.activeSessionStartedAt === null) {
      this.activeSessionStartedAt = this.getNow();
    }

    this.ensureInterval();
  }

  pauseTracking() {
    this.commitElapsedTime();
    this.activeSessionStartedAt = null;
    this.clearInterval();
  }

  stopTracking() {
    this.pauseTracking();
    this.activeVaultIdInternal = null;
  }

  markDismissed(vaultId: string) {
    if (!vaultId) return;
    if (this.activeVaultIdInternal === vaultId) {
      this.commitElapsedTime();
    }
    this.updateRecord(vaultId, { status: "dismissed" });
  }

  markApplied(vaultId: string) {
    if (!vaultId) return;
    if (this.activeVaultIdInternal === vaultId) {
      this.commitElapsedTime();
    }
    this.updateRecord(vaultId, { status: "applied" });
  }

  shouldAutoPrompt(vaultId: string, entityCount: number): boolean {
    if (!vaultId) return false;

    const record = this.getRecord(vaultId);
    if (record.status !== "not_shown") return false;

    return (
      entityCount >= THREE_ENTITIES ||
      (entityCount >= 1 && record.activeMs >= FIVE_MINUTES_MS)
    );
  }

  getRecord(vaultId: string): VaultThemePromptRecord {
    this.ensureRecordLoaded(vaultId);
    return this.records[vaultId] ?? { status: "not_shown", activeMs: 0 };
  }

  private ensureRecordLoaded(vaultId: string) {
    if (this.records[vaultId]) return;

    const record = this.persistence.read<VaultThemePromptRecord>(
      this.storageKey(vaultId),
      (raw) => {
        const parsed = JSON.parse(raw) as Partial<VaultThemePromptRecord>;
        return {
          status:
            parsed.status === "dismissed" || parsed.status === "applied"
              ? parsed.status
              : "not_shown",
          activeMs:
            typeof parsed.activeMs === "number" && parsed.activeMs > 0
              ? parsed.activeMs
              : 0,
        };
      },
      { status: "not_shown", activeMs: 0 },
    );

    this.records = {
      ...this.records,
      [vaultId]: record,
    };
  }

  private updateRecord(
    vaultId: string,
    patch: Partial<VaultThemePromptRecord>,
  ) {
    const current = this.getRecord(vaultId);
    const next = {
      ...current,
      ...patch,
    };

    this.records = {
      ...this.records,
      [vaultId]: next,
    };

    this.persistence.write(this.storageKey(vaultId), next);
  }

  private commitElapsedTime() {
    const vaultId = this.activeVaultIdInternal;
    const startedAt = this.activeSessionStartedAt;
    if (!vaultId || startedAt === null) return;

    const elapsedMs = Math.max(0, this.getNow() - startedAt);
    if (elapsedMs > 0) {
      const current = this.getRecord(vaultId);
      this.updateRecord(vaultId, {
        activeMs: current.activeMs + elapsedMs,
      });
    }

    this.activeSessionStartedAt = this.getNow();
  }

  private ensureInterval() {
    if (this.intervalId !== null) return;

    this.intervalId = setInterval(() => {
      this.commitElapsedTime();
    }, this.syncIntervalMs);
  }

  private clearInterval() {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private storageKey(vaultId: string) {
    return `${STORAGE_KEY_PREFIX}${vaultId}`;
  }
}

const KEY = "__codex_vault_theme_prompt_store__";
export const vaultThemePromptStore: VaultThemePromptStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new VaultThemePromptStore());
