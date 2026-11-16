export const CURRENT_HISTORICAL_ANCHOR_VERSION = 1 as const;
export const HISTORICAL_ANCHOR_FALLBACK_ACTION =
  "play-in-era-without-anchor" as const;
export const HISTORICAL_ANCHOR_TITLE_SECRET_ID = "anchor-title" as const;
export const historicalAnchorEntitySecretId = (
  recordId: string,
  field = "name",
) => `anchor-entity-${recordId}-${field}`;
export const historicalAnchorDateSecretId = (
  edge: "start" | "end",
  field: string,
) => `anchor-event-${edge}-${field}`;

export const MAX_HISTORICAL_DOCUMENTED_FACTS = 20;
export const MAX_HISTORICAL_OPEN_MECHANISMS = 16;
export const MAX_HISTORICAL_ENTITY_REFS = 20;
export const MAX_HISTORICAL_CAUSAL_REFS = 40;
export const MAX_HISTORICAL_DRIFT_CHANGES = 20;
export const DEFAULT_APPROACHING_THRESHOLD_DAYS = 30;

export type HistoricalAnchorPolicy = "preserve" | "alternate" | "discover";

export type HistoricalAnchorProgressStatus =
  "upcoming" | "approaching" | "reached" | "diverged" | "unresolved";

export type HistoricalAnchorCausalKind =
  "setup" | "turn" | "world-time" | "scenario-event" | "manual";

export interface AdventureCalendarDate {
  year: number;
  month?: number;
  day?: number;
  precision?: "year" | "unit" | "day" | "anchor";
  unitId?: string;
  anchorId?: string;
  calendarRevision?: number;
  label?: string;
}

export interface HistoricalDateInterval {
  start: AdventureCalendarDate;
  end?: AdventureCalendarDate;
  approximate?: boolean;
  label?: string;
}

export interface HistoricalAnchorCausalRef {
  kind: HistoricalAnchorCausalKind;
  refId: string;
  atMinute?: number;
  summary?: string;
}

export interface HistoricalAnchorDocumentedFact {
  id: string;
  text: string;
}

export interface HistoricalAnchorEntityRef {
  recordId: string;
  recordType?: string;
  displayName: string;
  role?: string;
}

export interface HistoricalAnchorBaseline {
  title: string;
  contentFingerprint: string;
  capturedAt: string;
  calendarRevision: number;
  documentedFacts: HistoricalAnchorDocumentedFact[];
  openMechanisms: string[];
  relevantEntityRefs: HistoricalAnchorEntityRef[];
}

export interface HistoricalAnchorProgress {
  status: HistoricalAnchorProgressStatus;
  updatedAtRevision: number;
  updatedAt: string;
  causalRefs: HistoricalAnchorCausalRef[];
  reason?: string;
}

export interface HistoricalAnchorDrift {
  status: "clean" | "vault-modified" | "vault-missing";
  rebaseDecisionRequired: boolean;
  detectedAt?: string;
  currentFingerprint?: string;
  changes?: string[];
}

export interface HistoricalAnchor {
  version: 1;
  policy: HistoricalAnchorPolicy;
  eventRecordId: string;
  eventInterval: HistoricalDateInterval;
  startDate: AdventureCalendarDate;
  baseline: HistoricalAnchorBaseline;
  revealedFactIds: string[];
  progress: HistoricalAnchorProgress;
  drift: HistoricalAnchorDrift;
}

export interface HistoricalEventSnapshot {
  id: string;
  type: string;
  title: string;
  content?: string;
  lore?: string;
  date?: AdventureCalendarDate;
  start_date?: AdventureCalendarDate;
  end_date?: AdventureCalendarDate;
  approximate?: boolean;
  dateLabel?: string;
  documentedFacts?: Array<string | { id?: string; text: string }>;
  openMechanisms?: string[];
  relevantEntityRefs?: HistoricalAnchorEntityRef[];
}

export type HistoricalAnchorValidationErrorCode =
  | "invalid-source-id"
  | "missing-event-date"
  | "invalid-date"
  | "calendar-mismatch"
  | "invalid-date-range"
  | "start-after-event"
  | "ambiguous-comparison";

export interface HistoricalAnchorValidationFailure {
  ok: false;
  code: HistoricalAnchorValidationErrorCode;
  reason: string;
  fallbackAction: typeof HISTORICAL_ANCHOR_FALLBACK_ACTION;
}

export interface HistoricalAnchorCompatibilitySuccess {
  ok: true;
  eventInterval: HistoricalDateInterval;
  startDate: AdventureCalendarDate;
  calendarRevision: number;
}

export type HistoricalAnchorCompatibilityResult =
  HistoricalAnchorCompatibilitySuccess | HistoricalAnchorValidationFailure;

export type HistoricalAnchorCreationResult =
  { ok: true; anchor: HistoricalAnchor } | HistoricalAnchorValidationFailure;

export interface HistoricalAnchorDriftReport {
  status: "clean" | "vault-modified" | "vault-missing";
  rebaseDecisionRequired: boolean;
  currentFingerprint?: string;
  changes: string[];
}

export type HistoricalAnchorMutationFailureReason =
  | "missing-historical-anchor"
  | "stale-revision"
  | "read-only-session"
  | "pending-roll"
  | "missing-causal-ref"
  | "incompatible-rebase"
  | "state-budget-exceeded";

export type HistoricalAnchorMutationResult<T> =
  | { ok: true; session: T }
  | {
      ok: false;
      reason: HistoricalAnchorMutationFailureReason;
      message: string;
      validationFailure?: HistoricalAnchorValidationFailure;
    };

export interface PlayerHistoricalAnchorProjection {
  version: 1;
  policy: HistoricalAnchorPolicy;
  startDate: AdventureCalendarDate;
  title?: string;
  progress: {
    status: HistoricalAnchorProgressStatus;
    updatedAtRevision: number;
    updatedAt: string;
  };
  revealedFacts: HistoricalAnchorDocumentedFact[];
}

export interface GmHistoricalAnchorProjection {
  version: 1;
  policy: HistoricalAnchorPolicy;
  eventRecordId: string;
  title: string;
  titleRevealed: boolean;
  startDate: AdventureCalendarDate;
  eventInterval: HistoricalDateInterval;
  documentedFacts: Array<
    HistoricalAnchorDocumentedFact & { revealed: boolean }
  >;
  openMechanisms: string[];
  relevantEntityRefs: HistoricalAnchorEntityRef[];
  progress: HistoricalAnchorProgress;
  drift: HistoricalAnchorDrift;
}

export interface DayInterval {
  first: number;
  last: number;
}
