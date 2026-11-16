import type { WorldCalendar } from "chronology-engine";
import {
  clonePreservingPrecision,
  dateToDayInterval,
  getCalendarRevision,
  hasCalendarRevisionMismatch,
  intervalToDayInterval,
  isUnplacedAnchorDate,
  projectElapsedDayInterval,
} from "./historical-anchor-chronology";
import { parseHistoricalAnchor } from "./historical-anchor-schemas";
import {
  CURRENT_HISTORICAL_ANCHOR_VERSION,
  DEFAULT_APPROACHING_THRESHOLD_DAYS,
  HISTORICAL_ANCHOR_FALLBACK_ACTION,
  HISTORICAL_ANCHOR_TITLE_SECRET_ID,
  MAX_HISTORICAL_CAUSAL_REFS,
  MAX_HISTORICAL_DOCUMENTED_FACTS,
  MAX_HISTORICAL_DRIFT_CHANGES,
  MAX_HISTORICAL_ENTITY_REFS,
  MAX_HISTORICAL_OPEN_MECHANISMS,
  type AdventureCalendarDate,
  type DayInterval,
  type GmHistoricalAnchorProjection,
  type HistoricalAnchor,
  type HistoricalAnchorCausalRef,
  type HistoricalAnchorCompatibilityResult,
  type HistoricalAnchorCreationResult,
  type HistoricalAnchorDocumentedFact,
  type HistoricalAnchorDriftReport,
  type HistoricalAnchorEntityRef,
  type HistoricalAnchorMutationResult,
  type HistoricalAnchorPolicy,
  type HistoricalAnchorProgressStatus,
  type HistoricalAnchorValidationErrorCode,
  type HistoricalAnchorValidationFailure,
  type HistoricalDateInterval,
  type HistoricalEventSnapshot,
  type PlayerHistoricalAnchorProjection,
} from "./historical-anchor-types";
import { parseAdventureSession } from "./schemas";
import type { AdventureSession } from "./types";

const MAX_TEXT_CHARS = 600;
const STANDARD_OPEN_MECHANISMS = [
  "cause",
  "responsible-actor",
  "location",
  "exact-date",
  "consequences",
] as const;

function fail(
  code: HistoricalAnchorValidationErrorCode,
  reason: string,
): HistoricalAnchorValidationFailure {
  return {
    ok: false,
    code,
    reason,
    fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
  };
}

function clampText(value: string, max = MAX_TEXT_CHARS): string {
  return value.trim().slice(0, max);
}

function fnv1a32(input: string, seed: number): string {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(",")}}`;
}

/**
 * Deterministic synchronous digest over canonical Vault event snapshot fields.
 */
export function computeHistoricalEventFingerprint(
  event: HistoricalEventSnapshot,
  calendar?: WorldCalendar,
): string {
  const documentedFacts = extractDocumentedFacts(event);
  const relevantEntityRefs = normalizeEntityRefs(event.relevantEntityRefs);
  const payload = canonicalJson({
    id: event.id.trim(),
    type: event.type.trim(),
    title: clampText(event.title),
    startDate: event.start_date ?? event.date ?? null,
    endDate: event.end_date ?? (event.start_date ? null : (event.date ?? null)),
    approximate: Boolean(event.approximate),
    dateLabel: event.dateLabel ? clampText(event.dateLabel) : null,
    content: event.content ? clampText(event.content, 4_000) : null,
    lore: event.lore ? clampText(event.lore, 4_000) : null,
    documentedFacts,
    relevantEntityRefs,
    calendarRevision: calendar ? getCalendarRevision(calendar) : null,
  });
  return (
    fnv1a32(payload, 0x811c9dc5) +
    fnv1a32(payload, 0x9e3779b9) +
    fnv1a32(payload, 0x85ebca6b) +
    fnv1a32(payload, 0xc2b2ae35)
  );
}

function extractDocumentedFacts(
  event: HistoricalEventSnapshot,
): HistoricalAnchorDocumentedFact[] {
  if (event.documentedFacts && event.documentedFacts.length > 0) {
    return normalizeDocumentedFacts(event.documentedFacts);
  }

  return deriveDocumentedFacts(event);
}

function normalizeDocumentedFacts(
  entries: NonNullable<HistoricalEventSnapshot["documentedFacts"]>,
): HistoricalAnchorDocumentedFact[] {
  const facts: HistoricalAnchorDocumentedFact[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const fact = normalizeDocumentedFact(entry, facts.length + 1);
    if (!fact || seen.has(fact.id)) continue;
    seen.add(fact.id);
    facts.push(fact);
    if (facts.length >= MAX_HISTORICAL_DOCUMENTED_FACTS) break;
  }
  return facts;
}

function normalizeDocumentedFact(
  entry: NonNullable<HistoricalEventSnapshot["documentedFacts"]>[number],
  fallbackIndex: number,
): HistoricalAnchorDocumentedFact | null {
  const text = clampText(typeof entry === "string" ? entry : entry.text);
  if (!text) return null;
  const fallbackId = `anchor-fact-${fallbackIndex}`;
  const id =
    typeof entry === "string"
      ? fallbackId
      : (entry.id?.trim() || fallbackId).slice(0, 160);
  return { id, text };
}

function deriveDocumentedFacts(
  event: HistoricalEventSnapshot,
): HistoricalAnchorDocumentedFact[] {
  const rawSource = [event.content, event.lore]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("\n");
  const segments = rawSource
    .split(/\r?\n+|(?<=[.!?])\s+/)
    .map((segment) => clampText(segment))
    .filter((segment) => segment.length > 0);
  if (segments.length === 0 && event.title.trim()) {
    return [{ id: "anchor-fact-1", text: clampText(event.title) }];
  }
  return segments
    .slice(0, MAX_HISTORICAL_DOCUMENTED_FACTS)
    .map((text, index) => ({
      id: `anchor-fact-${index + 1}`,
      text,
    }));
}

function normalizeEntityRefs(
  refs: HistoricalAnchorEntityRef[] | undefined,
): HistoricalAnchorEntityRef[] {
  if (!refs || refs.length === 0) return [];
  const normalized: HistoricalAnchorEntityRef[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const normalizedRef = normalizeEntityRef(ref);
    if (!normalizedRef || seen.has(normalizedRef.recordId)) continue;
    seen.add(normalizedRef.recordId);
    normalized.push(normalizedRef);
    if (normalized.length >= MAX_HISTORICAL_ENTITY_REFS) break;
  }
  return normalized;
}

function normalizeEntityRef(
  ref: HistoricalAnchorEntityRef,
): HistoricalAnchorEntityRef | null {
  const recordId = ref.recordId.trim().slice(0, 160);
  const displayName = clampText(ref.displayName);
  if (!recordId || !displayName) return null;
  return {
    recordId,
    displayName,
    ...(ref.recordType?.trim()
      ? { recordType: clampText(ref.recordType) }
      : {}),
    ...(ref.role?.trim() ? { role: clampText(ref.role) } : {}),
  };
}

function isExactDayDate(date: AdventureCalendarDate): boolean {
  if (date.precision === "day") return true;
  if (!date.precision && date.month !== undefined && date.day !== undefined) {
    return true;
  }
  return false;
}

function inferOpenMechanisms(
  event: HistoricalEventSnapshot,
  eventInterval: HistoricalDateInterval,
  documentedFacts: HistoricalAnchorDocumentedFact[],
  entityRefs: HistoricalAnchorEntityRef[],
): string[] {
  if (event.openMechanisms)
    return normalizeOpenMechanisms(event.openMechanisms);

  const combinedText = documentedFacts
    .map((fact) => fact.text.toLocaleLowerCase())
    .join(" ");
  const roles = new Set(
    entityRefs
      .map((ref) => ref.role?.toLocaleLowerCase().trim())
      .filter((role): role is string => Boolean(role)),
  );
  const open = inferMechanismsFromEvidence(combinedText, roles, eventInterval);
  return open.length > 0 ? open : [...STANDARD_OPEN_MECHANISMS];
}

function normalizeOpenMechanisms(mechanisms: string[]): string[] {
  return [
    ...new Set(
      mechanisms.map((item) => item.trim().slice(0, 160)).filter(Boolean),
    ),
  ].slice(0, MAX_HISTORICAL_OPEN_MECHANISMS);
}

function inferMechanismsFromEvidence(
  text: string,
  roles: Set<string>,
  interval: HistoricalDateInterval,
): string[] {
  return [
    ...(!hasCauseEvidence(text) ? ["cause"] : []),
    ...(!hasResponsibleActorEvidence(text, roles) ? ["responsible-actor"] : []),
    ...(!hasLocationEvidence(text, roles) ? ["location"] : []),
    ...(needsExactDate(interval) ? ["exact-date"] : []),
    ...(!hasConsequenceEvidence(text) ? ["consequences"] : []),
  ];
}

function hasCauseEvidence(text: string): boolean {
  return /\b(because|caused by|due to|resulted from)\b/.test(text);
}

function hasResponsibleActorEvidence(
  text: string,
  roles: Set<string>,
): boolean {
  const knownRole = ["responsible-actor", "culprit", "perpetrator"].some(
    (role) => roles.has(role),
  );
  return knownRole || /\b(by|culprit|assassin|killer|perpetrator)\b/.test(text);
}

function hasLocationEvidence(text: string, roles: Set<string>): boolean {
  const knownRole = ["location", "place"].some((role) => roles.has(role));
  return knownRole || /\b(at|in the|inside|near)\s+[a-z]{3,}/.test(text);
}

function needsExactDate(interval: HistoricalDateInterval): boolean {
  return (
    interval.approximate === true ||
    interval.end !== undefined ||
    !isExactDayDate(interval.start)
  );
}

function hasConsequenceEvidence(text: string): boolean {
  return /\b(aftermath|consequence|resulted in|led to)\b/.test(text);
}

function extractEventRawDates(event: HistoricalEventSnapshot): {
  rawStart?: AdventureCalendarDate;
  rawEnd?: AdventureCalendarDate;
} {
  if (event.start_date) {
    return {
      rawStart: event.start_date,
      rawEnd: event.end_date,
    };
  }
  if (event.date) {
    return {
      rawStart: event.date,
      rawEnd: event.end_date,
    };
  }
  if (event.end_date) {
    return {
      rawStart: event.end_date,
      rawEnd: event.end_date,
    };
  }
  return {};
}

function intervalsOverlap(a: DayInterval, b: DayInterval): boolean {
  return a.first <= b.last && a.last >= b.first;
}

function deriveStatusFromIntervals(
  current: DayInterval,
  event: DayInterval,
  approachingThresholdDays = DEFAULT_APPROACHING_THRESHOLD_DAYS,
): HistoricalAnchorProgressStatus {
  if (current.first >= event.first) return "reached";
  if (event.first - current.last <= approachingThresholdDays) {
    return "approaching";
  }
  return "upcoming";
}

export interface ValidateHistoricalAnchorCompatibilityInput {
  event: HistoricalEventSnapshot | null | undefined;
  startDate: AdventureCalendarDate | null | undefined;
  calendar: WorldCalendar;
}

export function validateHistoricalAnchorCompatibility(
  input: ValidateHistoricalAnchorCompatibilityInput,
): HistoricalAnchorCompatibilityResult {
  const { event, startDate, calendar } = input;
  const sourceFailure = validateHistoricalAnchorSource(event);
  if (sourceFailure) return sourceFailure;

  // Source validation narrows the event to a valid record.
  const validEvent = event as HistoricalEventSnapshot;
  const { rawStart, rawEnd } = extractEventRawDates(validEvent);
  if (!rawStart) {
    return fail(
      "missing-event-date",
      "The selected Vault event has no date to anchor against.",
    );
  }

  const startDateFailure = validateStartingDate(startDate);
  if (startDateFailure) return startDateFailure;
  const validStartDate = startDate as AdventureCalendarDate;

  const revisionFailure = validateCalendarRevisions(
    validStartDate,
    rawStart,
    rawEnd,
    calendar,
  );
  if (revisionFailure) return revisionFailure;

  const intervals = getCompatibilityIntervals(
    validStartDate,
    rawStart,
    rawEnd,
    calendar,
  );
  if (!intervals.ok) return intervals;
  const { startInterval, eventDayInterval } = intervals;

  if (startInterval.first > eventDayInterval.last) {
    return fail(
      "start-after-event",
      "The chosen starting date falls after the anchored historical event.",
    );
  }

  const ambiguousFailure = validateUnambiguousComparison(
    validEvent,
    validStartDate,
    rawStart,
    rawEnd,
    startInterval,
    eventDayInterval,
    calendar,
  );
  if (ambiguousFailure) return ambiguousFailure;

  const eventInterval: HistoricalDateInterval = {
    start: clonePreservingPrecision(rawStart),
    ...(rawEnd ? { end: clonePreservingPrecision(rawEnd) } : {}),
    ...(validEvent.approximate ? { approximate: true } : {}),
    ...(validEvent.dateLabel ? { label: clampText(validEvent.dateLabel) } : {}),
  };

  return {
    ok: true,
    eventInterval,
    startDate: clonePreservingPrecision(validStartDate),
    calendarRevision: getCalendarRevision(calendar),
  };
}

function validateHistoricalAnchorSource(
  event: HistoricalEventSnapshot | null | undefined,
): HistoricalAnchorValidationFailure | null {
  if (
    event &&
    typeof event === "object" &&
    event.id?.trim() &&
    event.type === "event"
  ) {
    return null;
  }
  return fail(
    "invalid-source-id",
    "Historical anchor requires an existing Vault event record.",
  );
}

function validateStartingDate(
  date: AdventureCalendarDate | null | undefined,
): HistoricalAnchorValidationFailure | null {
  return date && typeof date === "object"
    ? null
    : fail("invalid-date", "A valid starting date is required.");
}

function validateCalendarRevisions(
  startDate: AdventureCalendarDate,
  rawStart: AdventureCalendarDate,
  rawEnd: AdventureCalendarDate | undefined,
  calendar: WorldCalendar,
): HistoricalAnchorValidationFailure | null {
  if (
    hasCalendarRevisionMismatch(startDate, calendar) ||
    hasCalendarRevisionMismatch(rawStart, calendar) ||
    (rawEnd && hasCalendarRevisionMismatch(rawEnd, calendar))
  ) {
    return fail(
      "calendar-mismatch",
      "The starting date or event date uses a stale calendar revision.",
    );
  }
  if (
    startDate.calendarRevision !== undefined &&
    rawStart.calendarRevision !== undefined &&
    startDate.calendarRevision !== rawStart.calendarRevision
  ) {
    return fail(
      "calendar-mismatch",
      "The starting date and event date belong to different calendar revisions.",
    );
  }
  return null;
}

function getCompatibilityIntervals(
  startDate: AdventureCalendarDate,
  rawStart: AdventureCalendarDate,
  rawEnd: AdventureCalendarDate | undefined,
  calendar: WorldCalendar,
):
  | { ok: true; startInterval: DayInterval; eventDayInterval: DayInterval }
  | HistoricalAnchorValidationFailure {
  const startInterval = dateToDayInterval(startDate, calendar);
  if (!startInterval) {
    return fail(
      "invalid-date",
      "The starting date is not valid in the active calendar.",
    );
  }
  const eventStartInterval = dateToDayInterval(rawStart, calendar);
  if (!eventStartInterval) {
    return fail(
      "invalid-date",
      "The event start date is not valid in the active calendar.",
    );
  }
  const eventEndInterval = rawEnd ? dateToDayInterval(rawEnd, calendar) : null;
  if (rawEnd && !eventEndInterval) {
    return fail(
      "invalid-date",
      "The event end date is not valid in the active calendar.",
    );
  }
  if (eventEndInterval && eventStartInterval.first > eventEndInterval.last) {
    return fail(
      "invalid-date-range",
      "The event date range starts after it ends.",
    );
  }
  return {
    ok: true,
    startInterval,
    eventDayInterval: {
      first: eventStartInterval.first,
      last: (eventEndInterval ?? eventStartInterval).last,
    },
  };
}

function validateUnambiguousComparison(
  event: HistoricalEventSnapshot,
  startDate: AdventureCalendarDate,
  rawStart: AdventureCalendarDate,
  rawEnd: AdventureCalendarDate | undefined,
  startInterval: DayInterval,
  eventDayInterval: DayInterval,
  calendar: WorldCalendar,
): HistoricalAnchorValidationFailure | null {
  const overlaps = intervalsOverlap(startInterval, eventDayInterval);
  if (!overlaps) return null;
  const ambiguousBoundary =
    event.approximate ||
    isUnplacedAnchorDate(rawStart, calendar) ||
    (rawEnd !== undefined && isUnplacedAnchorDate(rawEnd, calendar)) ||
    isUnplacedAnchorDate(startDate, calendar);
  return ambiguousBoundary
    ? fail(
        "ambiguous-comparison",
        "The starting date overlaps an approximate or unplaced-anchor event boundary and cannot be ordered unambiguously.",
      )
    : null;
}

export interface CreateHistoricalAnchorInput extends ValidateHistoricalAnchorCompatibilityInput {
  policy?: HistoricalAnchorPolicy;
  now: string;
  revision?: number;
  setupRefId?: string;
}

export function validateAndCreateHistoricalAnchor(
  input: CreateHistoricalAnchorInput,
): HistoricalAnchorCreationResult {
  const compatibility = validateHistoricalAnchorCompatibility(input);
  if (!compatibility.ok) return compatibility;

  const event = input.event!;
  const policy: HistoricalAnchorPolicy = input.policy ?? "preserve";
  const documentedFacts = extractDocumentedFacts(event);
  const relevantEntityRefs = normalizeEntityRefs(event.relevantEntityRefs);
  const openMechanisms = inferOpenMechanisms(
    event,
    compatibility.eventInterval,
    documentedFacts,
    relevantEntityRefs,
  );
  const startInterval = dateToDayInterval(
    compatibility.startDate,
    input.calendar,
  )!;
  const eventIntervalDays = intervalToDayInterval(
    compatibility.eventInterval,
    input.calendar,
  )!;

  const anchorCandidate: HistoricalAnchor = {
    version: CURRENT_HISTORICAL_ANCHOR_VERSION,
    policy,
    eventRecordId: event.id.trim(),
    eventInterval: compatibility.eventInterval,
    startDate: compatibility.startDate,
    baseline: {
      title: clampText(event.title),
      contentFingerprint: computeHistoricalEventFingerprint(
        event,
        input.calendar,
      ),
      capturedAt: input.now,
      calendarRevision: compatibility.calendarRevision,
      documentedFacts,
      openMechanisms,
      relevantEntityRefs,
    },
    revealedFactIds: [],
    progress: {
      status: deriveStatusFromIntervals(startInterval, eventIntervalDays),
      updatedAtRevision: input.revision ?? 0,
      updatedAt: input.now,
      causalRefs: [
        {
          kind: "setup",
          refId: input.setupRefId ?? "adventure-setup",
          summary: "Historical anchor initialized.",
        },
      ],
    },
    drift: {
      status: "clean",
      rebaseDecisionRequired: false,
    },
  };

  return { ok: true, anchor: parseHistoricalAnchor(anchorCandidate) };
}

export function deriveHistoricalAnchorProgress(
  session: AdventureSession,
  calendar: WorldCalendar,
  options?: { approachingThresholdDays?: number },
): HistoricalAnchorProgressStatus {
  const anchor = session.historicalAnchor;
  if (!anchor) return "unresolved";
  if (anchor.progress.status === "diverged") return "diverged";

  const elapsedMinutes = session.worldTime?.elapsedMinutes ?? 0;
  const currentInterval = projectElapsedDayInterval(
    anchor.startDate,
    calendar,
    elapsedMinutes,
  );
  const eventInterval = intervalToDayInterval(anchor.eventInterval, calendar);
  if (!currentInterval || !eventInterval) return "unresolved";

  return deriveStatusFromIntervals(
    currentInterval,
    eventInterval,
    options?.approachingThresholdDays,
  );
}

function mutationError(
  reason: HistoricalAnchorMutationResult<AdventureSession> & { ok: false },
): HistoricalAnchorMutationResult<AdventureSession> {
  return reason;
}

function checkSessionEditable(
  session: AdventureSession,
  expectedRevision: number,
): (HistoricalAnchorMutationResult<AdventureSession> & { ok: false }) | null {
  if (!session.historicalAnchor) {
    return {
      ok: false,
      reason: "missing-historical-anchor",
      message: "Session has no historical anchor.",
    };
  }
  if (session.revision !== expectedRevision) {
    return {
      ok: false,
      reason: "stale-revision",
      message: "Session revision does not match expectedRevision.",
    };
  }
  if (session.status !== "active") {
    return {
      ok: false,
      reason: "read-only-session",
      message: "Archived sessions cannot be modified.",
    };
  }
  if (session.pendingRoll !== null) {
    return {
      ok: false,
      reason: "pending-roll",
      message:
        "Resolve the pending roll before modifying the historical anchor.",
    };
  }
  return null;
}

export interface TransitionHistoricalAnchorProgressInput {
  expectedRevision: number;
  status: HistoricalAnchorProgressStatus;
  causalRefs: HistoricalAnchorCausalRef[];
  reason?: string;
  now: string;
}

export function transitionHistoricalAnchorProgress(
  session: AdventureSession,
  input: TransitionHistoricalAnchorProgressInput,
): HistoricalAnchorMutationResult<AdventureSession> {
  const precheck = checkSessionEditable(session, input.expectedRevision);
  if (precheck) return mutationError(precheck);

  if (input.causalRefs.length === 0) {
    return {
      ok: false,
      reason: "missing-causal-ref",
      message:
        "Post-setup historical anchor progress transitions require at least one causalRef.",
    };
  }

  const next = structuredClone(session);
  const anchor = next.historicalAnchor!;
  const nextRevision = next.revision + 1;
  const defaultDivergedReason =
    anchor.policy === "alternate"
      ? "Alternate timeline: committed play diverged from the anchored event baseline."
      : "Canon divergence: committed play contradicted a fixed baseline constraint.";

  anchor.progress = {
    status: input.status,
    updatedAtRevision: nextRevision,
    updatedAt: input.now,
    causalRefs: [...anchor.progress.causalRefs, ...input.causalRefs].slice(
      -MAX_HISTORICAL_CAUSAL_REFS,
    ),
    ...(input.reason?.trim()
      ? { reason: clampText(input.reason) }
      : input.status === "diverged"
        ? { reason: defaultDivergedReason }
        : {}),
  };
  next.revision = nextRevision;
  next.updatedAt = input.now;
  next.lastPlayedAt = input.now;

  try {
    return { ok: true, session: parseAdventureSession(next) };
  } catch {
    return {
      ok: false,
      reason: "state-budget-exceeded",
      message:
        "Updating historical anchor progress exceeds the session state budget.",
    };
  }
}

export function detectHistoricalAnchorDrift(
  anchor: HistoricalAnchor,
  currentEventSnapshot: HistoricalEventSnapshot | null | undefined,
  calendar: WorldCalendar,
): HistoricalAnchorDriftReport {
  if (
    !currentEventSnapshot ||
    currentEventSnapshot.type !== "event" ||
    currentEventSnapshot.id.trim() !== anchor.eventRecordId
  ) {
    return {
      status: "vault-missing",
      rebaseDecisionRequired: true,
      changes: ["Vault event record is missing or no longer an event."],
    };
  }

  const currentFingerprint = computeHistoricalEventFingerprint(
    currentEventSnapshot,
    calendar,
  );
  if (currentFingerprint === anchor.baseline.contentFingerprint) {
    return {
      status: "clean",
      rebaseDecisionRequired: false,
      currentFingerprint,
      changes: [],
    };
  }

  const changes: string[] = [];
  if (clampText(currentEventSnapshot.title) !== anchor.baseline.title) {
    changes.push("title");
  }
  const { rawStart, rawEnd } = extractEventRawDates(currentEventSnapshot);
  const currentDates = canonicalJson({
    start: rawStart ?? null,
    end: rawEnd ?? null,
    approximate: Boolean(currentEventSnapshot.approximate),
  });
  const baselineDates = canonicalJson({
    start: anchor.eventInterval.start,
    end: anchor.eventInterval.end ?? null,
    approximate: Boolean(anchor.eventInterval.approximate),
  });
  if (currentDates !== baselineDates) {
    changes.push("dates");
  }
  const currentFacts = canonicalJson(
    extractDocumentedFacts(currentEventSnapshot),
  );
  const baselineFacts = canonicalJson(anchor.baseline.documentedFacts);
  if (currentFacts !== baselineFacts) {
    changes.push("documentedFacts");
  }
  const currentRefs = canonicalJson(
    normalizeEntityRefs(currentEventSnapshot.relevantEntityRefs),
  );
  const baselineRefs = canonicalJson(anchor.baseline.relevantEntityRefs);
  if (currentRefs !== baselineRefs) {
    changes.push("relevantEntityRefs");
  }
  if (getCalendarRevision(calendar) !== anchor.baseline.calendarRevision) {
    changes.push("calendarRevision");
  }
  if (changes.length === 0) {
    changes.push("content");
  }

  return {
    status: "vault-modified",
    rebaseDecisionRequired: true,
    currentFingerprint,
    changes: changes.slice(0, MAX_HISTORICAL_DRIFT_CHANGES),
  };
}

export interface RecordHistoricalAnchorDriftInput {
  expectedRevision: number;
  currentEventSnapshot: HistoricalEventSnapshot | null | undefined;
  calendar: WorldCalendar;
  now: string;
}

export function recordHistoricalAnchorDrift(
  session: AdventureSession,
  input: RecordHistoricalAnchorDriftInput,
): HistoricalAnchorMutationResult<AdventureSession> {
  const precheck = checkSessionEditable(session, input.expectedRevision);
  if (precheck) return mutationError(precheck);

  const report = detectHistoricalAnchorDrift(
    session.historicalAnchor!,
    input.currentEventSnapshot,
    input.calendar,
  );
  const next = structuredClone(session);
  next.historicalAnchor!.drift = {
    status: report.status,
    rebaseDecisionRequired: report.rebaseDecisionRequired,
    detectedAt: input.now,
    ...(report.currentFingerprint
      ? { currentFingerprint: report.currentFingerprint }
      : {}),
    ...(report.changes.length > 0 ? { changes: report.changes } : {}),
  };
  next.revision += 1;
  next.updatedAt = input.now;

  try {
    return { ok: true, session: parseAdventureSession(next) };
  } catch {
    return {
      ok: false,
      reason: "state-budget-exceeded",
      message: "Recording anchor drift exceeds the session state budget.",
    };
  }
}

export type ResolveHistoricalAnchorDriftInput =
  | {
      expectedRevision: number;
      decision: "keep-baseline";
      now: string;
    }
  | {
      expectedRevision: number;
      decision: "rebase";
      currentEventSnapshot: HistoricalEventSnapshot | null | undefined;
      calendar: WorldCalendar;
      now: string;
    };

export function resolveHistoricalAnchorDrift(
  session: AdventureSession,
  input: ResolveHistoricalAnchorDriftInput,
): HistoricalAnchorMutationResult<AdventureSession> {
  const precheck = checkSessionEditable(session, input.expectedRevision);
  if (precheck) return mutationError(precheck);

  const next = structuredClone(session);
  const anchor = next.historicalAnchor!;

  if (input.decision === "keep-baseline") {
    anchor.drift = {
      ...anchor.drift,
      rebaseDecisionRequired: false,
    };
    next.revision += 1;
    next.updatedAt = input.now;
    try {
      return { ok: true, session: parseAdventureSession(next) };
    } catch {
      return {
        ok: false,
        reason: "state-budget-exceeded",
        message: "Resolving anchor drift exceeds the session state budget.",
      };
    }
  }

  const rebased = validateAndCreateHistoricalAnchor({
    event: input.currentEventSnapshot,
    startDate: anchor.startDate,
    calendar: input.calendar,
    policy: anchor.policy,
    now: input.now,
    revision: next.revision + 1,
  });
  if (!rebased.ok) {
    return {
      ok: false,
      reason: "incompatible-rebase",
      message: rebased.reason,
      validationFailure: rebased,
    };
  }

  const validFactIds = new Set(
    rebased.anchor.baseline.documentedFacts.map((fact) => fact.id),
  );
  anchor.eventInterval = rebased.anchor.eventInterval;
  anchor.baseline = rebased.anchor.baseline;
  anchor.revealedFactIds = anchor.revealedFactIds.filter(
    (id) => id === HISTORICAL_ANCHOR_TITLE_SECRET_ID || validFactIds.has(id),
  );
  anchor.drift = {
    status: "clean",
    rebaseDecisionRequired: false,
  };
  next.revision += 1;
  next.updatedAt = input.now;

  try {
    return { ok: true, session: parseAdventureSession(next) };
  } catch {
    return {
      ok: false,
      reason: "state-budget-exceeded",
      message:
        "Rebasing the historical anchor exceeds the session state budget.",
    };
  }
}

/**
 * Player-safe projection of the session's historical anchor.
 * Never exposes unrevealed `documentedFacts`, unrevealed `title`,
 * `relevantEntityRefs`, or unrevealed future `eventInterval` details.
 */
export function projectPlayerHistoricalAnchor(
  session: AdventureSession,
): PlayerHistoricalAnchorProjection | undefined {
  const anchor = session.historicalAnchor;
  if (!anchor) return undefined;
  const revealedSet = new Set(anchor.revealedFactIds);
  return {
    version: anchor.version,
    policy: anchor.policy,
    startDate: clonePreservingPrecision(anchor.startDate),
    ...(revealedSet.has(HISTORICAL_ANCHOR_TITLE_SECRET_ID)
      ? { title: anchor.baseline.title }
      : {}),
    progress: {
      status: anchor.progress.status,
      updatedAtRevision: anchor.progress.updatedAtRevision,
      updatedAt: anchor.progress.updatedAt,
    },
    revealedFacts: anchor.baseline.documentedFacts.filter((fact) =>
      revealedSet.has(fact.id),
    ),
  };
}

/**
 * Full GM/Oracle projection of the session's historical anchor.
 */
export function projectGmHistoricalAnchor(
  session: AdventureSession,
): GmHistoricalAnchorProjection | undefined {
  const anchor = session.historicalAnchor;
  if (!anchor) return undefined;
  const revealedSet = new Set(anchor.revealedFactIds);
  return {
    version: anchor.version,
    policy: anchor.policy,
    eventRecordId: anchor.eventRecordId,
    title: anchor.baseline.title,
    titleRevealed: revealedSet.has(HISTORICAL_ANCHOR_TITLE_SECRET_ID),
    startDate: clonePreservingPrecision(anchor.startDate),
    eventInterval: anchor.eventInterval,
    documentedFacts: anchor.baseline.documentedFacts.map((fact) => ({
      ...fact,
      revealed: revealedSet.has(fact.id),
    })),
    openMechanisms: [...anchor.baseline.openMechanisms],
    relevantEntityRefs: [...anchor.baseline.relevantEntityRefs],
    progress: anchor.progress,
    drift: anchor.drift,
  };
}
