import type {
  Entity,
  FactionResolution,
  FactionStatRole,
  FactionTurnChange,
  FactionTurnRecord,
  FactionTurnSettings,
  OutcomeBandId,
  WorldDateStamp,
} from "schema";

export type {
  FactionResolution,
  FactionStatRole,
  FactionTurnChange,
  FactionTurnRecord,
  FactionTurnSettings,
  FactionTurnState,
  FactionStatRoles,
  OppositionSource,
  OutcomeBandId,
  WorldDateStamp,
} from "schema";

/**
 * Deliberately defined here rather than imported from `@codex/adventure-engine`,
 * which has a structurally identical alias.
 *
 * Research R7 declined to take a dependency on that package: the two features
 * rhyme conceptually (propose -> review -> commit) but their payloads share
 * nothing. Duplicating a one-line type alias is cheaper than coupling faction
 * resolution to adventure sessions, and Constitution III's extraction trigger is
 * three duplications, not two.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; errors: E };

/**
 * Which tier of the current-date chain produced a date, mirroring
 * `CalendarCurrentDateSource` from chronology-engine without importing it (this
 * package stays dependency-light and takes the value as plain data).
 */
export type WorldDateSourceKind = "entity" | "vaultSetting" | "realWorld";

export interface ResolvedWorldDate {
  source: WorldDateSourceKind;
  date: { year: number; month: number; day?: number };
  entityId: string | null;
}

/**
 * Eligibility outcomes (FR-010..FR-014, FR-008a).
 *
 * `no-world-date` is the important one: it covers the case where the only date
 * available came from the real-world clock. That is not campaign time, and
 * treating it as such would make every faction eligible forever and stamp
 * history with the present-day year.
 */
export type EligibilityState =
  "no-world-date" | "never-acted" | "eligible" | "too-soon" | "clock-behind";

export interface EligibilityResult {
  state: EligibilityState;
  /** True only for `never-acted` and `eligible`. */
  canAct: boolean;
  /** True for `too-soon` and `clock-behind`; never for `no-world-date`. */
  canOverride: boolean;
  lastTurnDate?: WorldDateStamp;
  nextEligibleDate?: WorldDateStamp;
  /** Display-ready plain language (Constitution IX). */
  reason: string;
}

export interface ResolveInput {
  faction: Entity;
  target: Entity;
  /** Turn-enabled factions, used to derive an existing hold (FR-020b). */
  allFactions: Entity[];
  settings: FactionTurnSettings;
  worldDate: WorldDateStamp;
}

export type ResolveFailureKind =
  "role-unmapped" | "invalid-target" | "self-target";

export interface ResolveFailure {
  kind: ResolveFailureKind;
  /** Set when `kind` is `role-unmapped` (FR-005). */
  role?: FactionStatRole;
  message: string;
}

/** What the AI returned, before any range enforcement. */
export interface AiBandProposal {
  band: OutcomeBandId;
  reason: string;
}

/**
 * The uncommitted result of a resolution.
 *
 * Transient by contract (FR-022a): never persisted, never synced, never
 * restored. It lives only as long as the view that created it.
 */
export interface FactionTurnProposal {
  factionId: string;
  targetId: string;
  /** Snapshotted so history stays readable after the target is deleted (FR-040). */
  targetTitle: string;
  action: "influence";
  worldDate: WorldDateStamp;
  resolution: FactionResolution;
  changes: FactionTurnChange[];
  inverse: FactionTurnChange[];
  narrative: string;
  narrativeSource: "ai" | "template";
  /** Offered for the GM to opt into; never applied automatically (FR-032b). */
  suggestedTypeChange?: string;
  /** Staleness guard checked at commit (FR-026). */
  stateHash: string;
  isOverride: boolean;
}

/**
 * What `commit`/`reverse` return: a description of writes, not the writes
 * themselves. The store performs them through `EntityMutationService` so the
 * inbound-map and graph callbacks fire, and so this package stays storage-free.
 */
export interface CommitPlan {
  statUpdates: { fieldId: string; value: number }[];
  connectionWrite: {
    targetId: string;
    strength: number;
    type?: string;
    create: boolean;
  } | null;
  connectionRemove: { targetId: string } | null;
  /**
   * On `commit`: the new record to append to history.
   * On `reverse`: the existing record with `undone: true`, to replace in place —
   * FR-029 requires an undone turn to stay visible rather than be deleted.
   */
  record: FactionTurnRecord;
  /** Recomputed from the newest non-undone record; undefined when none remain. */
  lastTurnDate: WorldDateStamp | undefined;
}

export type CommitFailureKind = "stale" | "target-missing" | "not-most-recent";

export interface CommitFailure {
  kind: CommitFailureKind;
  message: string;
}
