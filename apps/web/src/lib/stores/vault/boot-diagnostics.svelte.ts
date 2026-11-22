import { systemClock } from "#lib/utils/runtime-deps.js";
import { debugStore } from "../debug.svelte";

export const BOOT_STAGES = [
  "boot_started",
  "registry_ready",
  "migration_ready",
  "theme_ready",
  "vault_cache_ready",
  "vault_data_ready",
  "templates_ready",
  "ready",
  "failed",
  "timed_out",
] as const;

export type BootStage = (typeof BOOT_STAGES)[number];

export type BootStatus = "idle" | "booting" | "ready" | "failed" | "timed_out";

export type CacheState = "warm" | "cold" | "unknown";

export const BOOT_ERROR_CODES = [
  "quota_exceeded",
  "storage_denied",
  "registry_failed",
  "migration_failed",
  "vault_handle_missing",
  "vault_load_failed",
  "unexpected",
] as const;

export type BootErrorCode = (typeof BOOT_ERROR_CODES)[number];

export const DEGRADED_AUXILIARY_SOURCES = [
  "preferences",
  "theme",
  "stat_sheet_templates",
  "presentation_templates",
  "entity_templates",
  "maps",
  "canvases",
  "publish_registry",
  "entity_count",
  "local_sync",
  "conflict_scan",
] as const;

export type DegradedAuxiliarySource =
  (typeof DEGRADED_AUXILIARY_SOURCES)[number];

const DEGRADED_SET: ReadonlySet<string> = new Set(DEGRADED_AUXILIARY_SOURCES);
const ERROR_CODE_SET: ReadonlySet<string> = new Set(BOOT_ERROR_CODES);

export const DEFAULT_BOOT_WATCHDOG_MS = 12_000;

export interface VaultBootDiagnosticsDeps {
  clock?: { now(): number };
  setTimeout?: (
    fn: () => void,
    ms: number,
  ) => ReturnType<typeof globalThis.setTimeout>;
  clearTimeout?: (id: ReturnType<typeof globalThis.setTimeout>) => void;
  watchdogMs?: number;
  warn?: (message: string, data?: unknown) => void;
}

function classifyDomExceptionName(err: unknown): BootErrorCode | null {
  let current: unknown = err;
  for (
    let depth = 0;
    depth < 3 && current && typeof current === "object";
    depth++
  ) {
    const name = (current as { name?: unknown }).name;
    if (name === "QuotaExceededError") return "quota_exceeded";
    if (name === "NotAllowedError" || name === "SecurityError") {
      return "storage_denied";
    }
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

/**
 * Classifies an arbitrary thrown value into a privacy-safe closed-enum error
 * code without retaining raw messages, paths, or stack traces.
 */
export function classifyBootError(
  err: unknown,
  fallback: BootErrorCode = "unexpected",
): BootErrorCode {
  const domCode = classifyDomExceptionName(err);
  if (domCode) return domCode;
  if (err && typeof err === "object") {
    const maybeCode = (err as { code?: unknown }).code;
    if (typeof maybeCode === "string" && ERROR_CODE_SET.has(maybeCode)) {
      return maybeCode as BootErrorCode;
    }
  }
  return fallback;
}

export interface VaultBootSnapshot {
  status: BootStatus;
  phase: BootStage | undefined;
  errorCode: BootErrorCode | undefined;
  summary: string | undefined;
}

export function readVaultBootSnapshot(
  diagnostics:
    | {
        status?: BootStatus;
        activePhase?: BootStage | null;
        errorCode?: BootErrorCode | null;
        formatDiagnosticSummary?: () => string;
      }
    | null
    | undefined,
): VaultBootSnapshot {
  return {
    status: diagnostics?.status ?? "idle",
    phase: diagnostics?.activePhase ?? undefined,
    errorCode: diagnostics?.errorCode ?? undefined,
    summary: diagnostics?.formatDiagnosticSummary?.(),
  };
}

function toCoarseCount(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

/**
 * Privacy-safe reactive boot telemetry and non-destructive watchdog.
 * Stores only closed-enum stages/codes, durations, and coarse counts — never
 * vault names, entity titles, filenames, paths, raw error messages, or user IDs.
 */
export class VaultBootDiagnostics {
  status = $state<BootStatus>("idle");
  activePhase = $state<BootStage | null>(null);
  attemptCount = $state(0);
  pendingDurationMs = $state(0);
  stageDurationsMs = $state<Partial<Record<BootStage, number>>>({});
  cacheState = $state<CacheState>("unknown");
  vaultCount = $state<number | null>(null);
  entityCount = $state<number | null>(null);
  degradedAuxiliary = $state<DegradedAuxiliarySource[]>([]);
  errorCode = $state<BootErrorCode | null>(null);

  private readonly clock: { now(): number };
  private readonly scheduleTimeout: (
    fn: () => void,
    ms: number,
  ) => ReturnType<typeof globalThis.setTimeout>;
  private readonly cancelTimeout: (
    id: ReturnType<typeof globalThis.setTimeout>,
  ) => void;
  private readonly watchdogMs: number;
  private readonly warn: (message: string, data?: unknown) => void;

  private watchdogTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private currentAttemptId = 0;
  private watchdogGeneration = 0;
  private attemptStartedAt = 0;

  constructor(deps: VaultBootDiagnosticsDeps = {}) {
    this.clock = deps.clock ?? systemClock;
    this.scheduleTimeout =
      deps.setTimeout ?? ((fn, ms) => globalThis.setTimeout(fn, ms));
    this.cancelTimeout =
      deps.clearTimeout ?? ((id) => globalThis.clearTimeout(id));
    this.watchdogMs = deps.watchdogMs ?? DEFAULT_BOOT_WATCHDOG_MS;
    this.warn = deps.warn ?? ((msg, data) => debugStore.warn(msg, data));
  }

  /**
   * Begins a new boot attempt, resetting per-attempt diagnostics and arming
   * the non-destructive watchdog timer. Returns the attempt identifier.
   */
  startAttempt(): number {
    this.clearTimer();
    this.currentAttemptId += 1;
    this.attemptCount += 1;
    this.attemptStartedAt = this.clock.now();
    this.status = "booting";
    this.activePhase = "boot_started";
    this.pendingDurationMs = 0;
    this.stageDurationsMs = { boot_started: 0 };
    this.cacheState = "unknown";
    this.degradedAuxiliary = [];
    this.errorCode = null;
    this.armWatchdog(this.currentAttemptId);
    return this.currentAttemptId;
  }

  /**
   * Re-arms the watchdog for an already-running attempt (e.g. while migration
   * or pending saves remain in flight) without resetting progress or aborting work.
   */
  rearmWatchdog(): number {
    this.clearTimer();
    this.attemptCount += 1;
    this.status = "booting";
    this.errorCode = null;
    this.armWatchdog(this.currentAttemptId);
    return this.currentAttemptId;
  }

  recordStage(stage: BootStage, attemptId?: number): void {
    if (attemptId !== undefined && attemptId !== this.currentAttemptId) {
      return;
    }
    const elapsed = Math.max(0, this.clock.now() - this.attemptStartedAt);
    this.stageDurationsMs = {
      ...this.stageDurationsMs,
      [stage]: elapsed,
    };
    if (
      stage !== "theme_ready" &&
      stage !== "templates_ready" &&
      this.status !== "ready"
    ) {
      this.activePhase = stage;
    }
  }

  recordReady(attemptId?: number): void {
    if (attemptId !== undefined && attemptId !== this.currentAttemptId) {
      return;
    }
    this.clearTimer();
    const elapsed = Math.max(0, this.clock.now() - this.attemptStartedAt);
    this.pendingDurationMs = elapsed;
    this.stageDurationsMs = {
      ...this.stageDurationsMs,
      ready: elapsed,
    };
    this.activePhase = "ready";
    this.errorCode = null;
    this.status = "ready";
  }

  recordFailure(code: BootErrorCode, attemptId?: number): void {
    if (attemptId !== undefined && attemptId !== this.currentAttemptId) {
      return;
    }
    this.clearTimer();
    const safeCode = ERROR_CODE_SET.has(code) ? code : "unexpected";
    const elapsed = Math.max(0, this.clock.now() - this.attemptStartedAt);
    this.pendingDurationMs = elapsed;
    this.stageDurationsMs = {
      ...this.stageDurationsMs,
      failed: elapsed,
    };
    this.errorCode = safeCode;
    this.status = "failed";
  }

  markDegraded(source: string): void {
    if (!DEGRADED_SET.has(source)) return;
    const typed = source as DegradedAuxiliarySource;
    if (!this.degradedAuxiliary.includes(typed)) {
      this.degradedAuxiliary = [...this.degradedAuxiliary, typed];
    }
  }

  setCacheState(state: CacheState): void {
    if (state === "warm" || state === "cold" || state === "unknown") {
      this.cacheState = state;
    }
  }

  setCounts(counts: { vaultCount?: number; entityCount?: number }): void {
    if (counts.vaultCount !== undefined) {
      this.vaultCount = toCoarseCount(counts.vaultCount);
    }
    if (counts.entityCount !== undefined) {
      this.entityCount = toCoarseCount(counts.entityCount);
    }
  }

  /**
   * Produces a plain-text, privacy-safe summary suitable for opt-in handoff
   * to the feedback dialog. Contains only enum labels and coarse counts.
   */
  formatDiagnosticSummary(): string {
    const durationMs =
      this.status === "booting"
        ? Math.max(0, this.clock.now() - this.attemptStartedAt)
        : this.pendingDurationMs;

    const stageList = BOOT_STAGES.filter(
      (stage) => this.stageDurationsMs[stage] !== undefined,
    )
      .map((stage) => `${stage} (${this.stageDurationsMs[stage]}ms)`)
      .join(", ");

    const lines = [
      "Vault startup diagnostics (privacy-safe summary)",
      `Status: ${this.status}`,
      `Phase: ${this.activePhase ?? "none"}`,
      `Error code: ${this.errorCode ?? "none"}`,
      `Attempt: ${this.attemptCount}`,
      `Duration: ${durationMs}ms`,
      `Cache state: ${this.cacheState}`,
      `Vault count: ${this.vaultCount ?? "unknown"}`,
      `Entity count: ${this.entityCount ?? "unknown"}`,
      `Degraded optional tasks: ${
        this.degradedAuxiliary.length > 0
          ? this.degradedAuxiliary.join(", ")
          : "none"
      }`,
      `Stages: ${stageList || "none"}`,
    ];

    return lines.join("\n");
  }

  dispose(): void {
    this.clearTimer();
  }

  private armWatchdog(attemptId: number): void {
    this.watchdogGeneration += 1;
    const generation = this.watchdogGeneration;
    this.watchdogTimer = this.scheduleTimeout(() => {
      this.watchdogTimer = null;
      if (
        generation !== this.watchdogGeneration ||
        attemptId !== this.currentAttemptId ||
        this.status !== "booting"
      ) {
        return;
      }
      const elapsed = Math.max(0, this.clock.now() - this.attemptStartedAt);
      this.pendingDurationMs = elapsed;
      this.stageDurationsMs = {
        ...this.stageDurationsMs,
        timed_out: elapsed,
      };
      this.status = "timed_out";
      this.warn("[VaultBootDiagnostics] Startup watchdog timed out", {
        phase: this.activePhase,
        attemptCount: this.attemptCount,
        pendingDurationMs: elapsed,
        cacheState: this.cacheState,
        vaultCount: this.vaultCount,
        entityCount: this.entityCount,
        degradedAuxiliary: [...this.degradedAuxiliary],
      });
    }, this.watchdogMs);
  }

  private clearTimer(): void {
    if (this.watchdogTimer !== null) {
      this.cancelTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }
}
