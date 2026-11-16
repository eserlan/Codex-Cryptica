import { describe, expect, it } from "bun:test";
import type { WorldCalendar } from "chronology-engine";
import {
  applyCompletedTurn,
  applyRollRequest,
  buildAdventurePrompt,
  buildAdventureRecap,
  createPlayerTranscript,
  dateToDayInterval,
  deriveHistoricalAnchorProgress,
  detectHiddenLeakage,
  detectHiddenTextLeakage,
  detectHistoricalAnchorDrift,
  formatAdventureDateWithEra,
  HISTORICAL_ANCHOR_FALLBACK_ACTION,
  HISTORICAL_ANCHOR_TITLE_SECRET_ID,
  intervalToDayInterval,
  migrateAdventureSession,
  migrateHistoricalAnchor,
  parseAdventureSession,
  parseHistoricalAnchor,
  projectGmHistoricalAnchor,
  projectPlayerHistoricalAnchor,
  recordHistoricalAnchorDrift,
  recordPendingRollOutcome,
  requiredGroundingSources,
  resolveHistoricalAnchorDrift,
  resolveHistoricalAnchorEraContext,
  resolveRecordedRoll,
  revealedSecretIds,
  transitionHistoricalAnchorProgress,
  validateAndCreateHistoricalAnchor,
  validateStateBudget,
  type AdventureSession,
  type AdventureCalendarDate,
  type HistoricalEventSnapshot,
} from "../src";
import {
  meta,
  now,
  proposal,
  session as makeSession,
} from "./reducer-fixtures";

const zeroEraCalendar: WorldCalendar = {
  useGregorian: false,
  daysPerWeek: 7,
  revision: 1,
  months: [
    { id: "m1", name: "Frostfall", days: 30 },
    { id: "m2", name: "Sunhigh", days: 30 },
    { id: "m3", name: "Leafwane", days: 30 },
  ],
  anchors: [
    {
      id: "solstice",
      name: "Winter Solstice",
      afterMonthId: "m3",
      afterDay: 15,
    },
    {
      id: "unplaced-omen",
      name: "Comet Night",
    },
  ],
};

const multiEraCalendar: WorldCalendar = {
  ...zeroEraCalendar,
  eras: [
    {
      id: "bf",
      name: "Before Founding",
      label: "BF",
      startYear: 600,
      direction: "backward",
      yearAtStart: 1,
    },
    {
      id: "af",
      name: "After Founding",
      label: "AF",
      startYear: 601,
      direction: "forward",
      yearAtStart: 1,
    },
  ],
};

function kingDeathEvent(
  overrides: Partial<HistoricalEventSnapshot> = {},
): HistoricalEventSnapshot {
  return {
    id: "evt-king-death",
    type: "event",
    title: "Death of King Aldous",
    content: "The king died in 620.",
    start_date: { year: 620, precision: "year", calendarRevision: 1 },
    ...overrides,
  };
}

function createHistoricalAnchorSession(
  event: HistoricalEventSnapshot = kingDeathEvent({
    start_date: {
      year: 620,
      precision: "day",
      unitId: "m2",
      day: 15,
      calendarRevision: 1,
    },
  }),
  startDate: AdventureCalendarDate = {
    year: 620,
    precision: "day",
    unitId: "m1",
    day: 1,
    calendarRevision: 1,
  },
): {
  anchor: NonNullable<AdventureSession["historicalAnchor"]>;
  session: AdventureSession;
} {
  const created = validateAndCreateHistoricalAnchor({
    event,
    startDate,
    calendar: zeroEraCalendar,
    policy: "preserve",
    now,
  });
  if (!created.ok)
    throw new Error(`Could not create test anchor: ${created.code}`);
  return {
    anchor: created.anchor,
    session: { ...makeSession(), historicalAnchor: created.anchor },
  };
}

function requireValue<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Expected operation to succeed");
  return result.value;
}

describe("HistoricalAnchor contract", () => {
  it("AC1: creates a year-only anchor without inventing month or day", () => {
    const result = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent(),
      startDate: { year: 617, precision: "year", calendarRevision: 1 },
      calendar: zeroEraCalendar,
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.anchor.policy).toBe("preserve");
    expect(result.anchor.progress.status).toBe("upcoming");
    expect(result.anchor.startDate.precision).toBe("year");
    expect(result.anchor.startDate.month).toBeUndefined();
    expect(result.anchor.startDate.day).toBeUndefined();
    expect(result.anchor.eventInterval.start.precision).toBe("year");
    expect(result.anchor.eventInterval.start.month).toBeUndefined();
    expect(result.anchor.eventInterval.start.day).toBeUndefined();
    expect(result.anchor.drift.status).toBe("clean");
    expect(result.anchor.drift.rebaseDecisionRequired).toBe(false);
  });

  it("AC2: records documentedFacts and openMechanisms and instructs GM in buildAdventurePrompt", () => {
    const created = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent(),
      startDate: { year: 617, precision: "year", calendarRevision: 1 },
      calendar: zeroEraCalendar,
      now,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(created.anchor.baseline.documentedFacts).toEqual([
      { id: "anchor-fact-1", text: "The king died in 620." },
    ]);
    expect(created.anchor.baseline.openMechanisms).toEqual([
      "cause",
      "responsible-actor",
      "location",
      "exact-date",
      "consequences",
    ]);

    const s: AdventureSession = {
      ...makeSession(),
      historicalAnchor: created.anchor,
    };
    const prompt = buildAdventurePrompt({
      session: s,
      phase: "opening",
      anchors: [],
      relevant: [],
    });

    expect(prompt.state).toContain("GM-ONLY historicalAnchor");
    expect(prompt.state).toContain("The king died in 620.");
    expect(prompt.behavior).toContain("openMechanisms");
    expect(prompt.behavior).toContain(
      "Do not invent missing calendar precision",
    );
    expect(prompt.behavior).toContain('Historical anchor policy is "preserve"');
  });

  it("AC3: validates all three policies, precisions, ranges, and zero/multi-era calendars with deterministic serialization", () => {
    const policies = ["preserve", "alternate", "discover"] as const;
    for (const policy of policies) {
      const created = validateAndCreateHistoricalAnchor({
        event: kingDeathEvent({
          start_date: {
            year: 620,
            precision: "day",
            unitId: "m2",
            day: 12,
            calendarRevision: 1,
          },
          end_date: {
            year: 620,
            precision: "unit",
            unitId: "m3",
            calendarRevision: 1,
          },
        }),
        startDate: {
          year: 618,
          precision: "anchor",
          anchorId: "solstice",
          calendarRevision: 1,
        },
        calendar: multiEraCalendar,
        policy,
        now,
      });
      expect(created.ok).toBe(true);
      if (!created.ok) continue;

      const s: AdventureSession = {
        ...makeSession(),
        historicalAnchor: created.anchor,
      };
      const roundTripped = parseAdventureSession(JSON.parse(JSON.stringify(s)));
      expect(roundTripped.historicalAnchor).toEqual(created.anchor);
      expect(validateStateBudget(roundTripped)).toBe(true);
    }

    // Forward and backward era formatting without mutating monotonic year comparison
    const bfEra = resolveHistoricalAnchorEraContext(
      { year: 590, precision: "year" },
      multiEraCalendar,
    );
    const afEra = resolveHistoricalAnchorEraContext(
      { year: 620, precision: "year" },
      multiEraCalendar,
    );
    expect(bfEra?.formattedYear).toBe("11 BF");
    expect(afEra?.formattedYear).toBe("20 AF");
    expect(
      formatAdventureDateWithEra(
        { year: 620, precision: "day", unitId: "m2", day: 5 },
        multiEraCalendar,
      ),
    ).toBe("5 Sunhigh, 20 AF");

    // Day-interval precision preservation
    const yearInterval = dateToDayInterval(
      { year: 620, precision: "year", calendarRevision: 1 },
      zeroEraCalendar,
    );
    expect(yearInterval).toEqual({ first: 620 * 90, last: 621 * 90 - 1 });
    const unitInterval = dateToDayInterval(
      { year: 620, precision: "unit", unitId: "m2", calendarRevision: 1 },
      zeroEraCalendar,
    );
    expect(unitInterval).toEqual({
      first: 620 * 90 + 30,
      last: 620 * 90 + 59,
    });
    const placedAnchorInterval = dateToDayInterval(
      {
        year: 620,
        precision: "anchor",
        anchorId: "solstice",
        calendarRevision: 1,
      },
      zeroEraCalendar,
    );
    expect(placedAnchorInterval).toEqual({
      first: 620 * 90 + 60 + 15,
      last: 620 * 90 + 60 + 15,
    });
    expect(
      intervalToDayInterval(
        {
          start: { year: 620, precision: "unit", unitId: "m1" },
          end: { year: 620, precision: "unit", unitId: "m2" },
        },
        zeroEraCalendar,
      ),
    ).toEqual({ first: 620 * 90, last: 620 * 90 + 59 });
  });

  it("AC4: rejects incompatible inputs with specific codes and play-in-era-without-anchor fallback", () => {
    const start617 = {
      year: 617,
      precision: "year" as const,
      calendarRevision: 1,
    };

    const missingRecord = validateAndCreateHistoricalAnchor({
      event: null,
      startDate: start617,
      calendar: zeroEraCalendar,
      now,
    });
    expect(missingRecord).toMatchObject({
      ok: false,
      code: "invalid-source-id",
      fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
    });

    const nonEvent = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent({ type: "character" }),
      startDate: start617,
      calendar: zeroEraCalendar,
      now,
    });
    expect(nonEvent).toMatchObject({
      ok: false,
      code: "invalid-source-id",
      fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
    });

    const undated = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent({ start_date: undefined, date: undefined }),
      startDate: start617,
      calendar: zeroEraCalendar,
      now,
    });
    expect(undated).toMatchObject({
      ok: false,
      code: "missing-event-date",
      fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
    });

    const invalidDate = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent(),
      startDate: {
        year: 617,
        precision: "day",
        unitId: "m1",
        day: 99,
        calendarRevision: 1,
      },
      calendar: zeroEraCalendar,
      now,
    });
    expect(invalidDate).toMatchObject({
      ok: false,
      code: "invalid-date",
      fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
    });

    const impossibleRange = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent({
        start_date: { year: 621, precision: "year", calendarRevision: 1 },
        end_date: { year: 619, precision: "year", calendarRevision: 1 },
      }),
      startDate: start617,
      calendar: zeroEraCalendar,
      now,
    });
    expect(impossibleRange).toMatchObject({
      ok: false,
      code: "invalid-date-range",
      fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
    });

    const startAfterEvent = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent(),
      startDate: { year: 625, precision: "year", calendarRevision: 1 },
      calendar: zeroEraCalendar,
      now,
    });
    expect(startAfterEvent).toMatchObject({
      ok: false,
      code: "start-after-event",
      fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
    });

    const staleRevision = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent({
        start_date: { year: 620, precision: "year", calendarRevision: 1 },
      }),
      startDate: { year: 617, precision: "year", calendarRevision: 2 },
      calendar: { ...zeroEraCalendar, revision: 2 },
      now,
    });
    expect(staleRevision).toMatchObject({
      ok: false,
      code: "calendar-mismatch",
      fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
    });

    const ambiguousApprox = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent({ approximate: true }),
      startDate: { year: 620, precision: "year", calendarRevision: 1 },
      calendar: zeroEraCalendar,
      now,
    });
    expect(ambiguousApprox).toMatchObject({
      ok: false,
      code: "ambiguous-comparison",
      fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
    });

    const ambiguousUnplacedAnchor = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent({
        start_date: {
          year: 620,
          precision: "anchor",
          anchorId: "unplaced-omen",
          calendarRevision: 1,
        },
      }),
      startDate: {
        year: 620,
        precision: "day",
        unitId: "m1",
        day: 10,
        calendarRevision: 1,
      },
      calendar: zeroEraCalendar,
      now,
    });
    expect(ambiguousUnplacedAnchor).toMatchObject({
      ok: false,
      code: "ambiguous-comparison",
      fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
    });
  });

  it("AC5: derives progress from fictional time", () => {
    const { session } = createHistoricalAnchorSession();
    expect(deriveHistoricalAnchorProgress(session, zeroEraCalendar)).toBe(
      "upcoming",
    );
    expect(
      deriveHistoricalAnchorProgress(
        {
          ...session,
          worldTime: { version: 1, elapsedMinutes: 20 * 1440, events: [] },
        },
        zeroEraCalendar,
      ),
    ).toBe("approaching");
    expect(
      deriveHistoricalAnchorProgress(
        {
          ...session,
          worldTime: { version: 1, elapsedMinutes: 44 * 1440, events: [] },
        },
        zeroEraCalendar,
      ),
    ).toBe("reached");
    expect(
      deriveHistoricalAnchorProgress(session, {
        ...zeroEraCalendar,
        revision: 9,
      }),
    ).toBe("unresolved");
  });

  it("AC5: rejects stale, archived, pending-roll and causality-free mutations", () => {
    const { session } = createHistoricalAnchorSession();
    expect(
      transitionHistoricalAnchorProgress(session, {
        expectedRevision: 99,
        status: "approaching",
        causalRefs: [{ kind: "world-time", refId: "wt-1", atMinute: 28800 }],
        now,
      }),
    ).toMatchObject({ ok: false, reason: "stale-revision" });
    expect(
      transitionHistoricalAnchorProgress(
        { ...session, status: "archived" },
        {
          expectedRevision: 0,
          status: "approaching",
          causalRefs: [{ kind: "world-time", refId: "wt-1" }],
          now,
        },
      ),
    ).toMatchObject({ ok: false, reason: "read-only-session" });
    const withRoll = requireValue(
      applyRollRequest(
        session,
        {
          kind: "roll-required",
          uncertainty: "Can they reach the keep?",
          stakes: "Time lost",
          sourceRecordIds: [],
        },
        meta,
      ),
    );
    expect(
      transitionHistoricalAnchorProgress(withRoll, {
        expectedRevision: withRoll.revision,
        status: "approaching",
        causalRefs: [{ kind: "turn", refId: "turn-1" }],
        now,
      }),
    ).toMatchObject({ ok: false, reason: "pending-roll" });
    expect(
      transitionHistoricalAnchorProgress(session, {
        expectedRevision: 0,
        status: "diverged",
        causalRefs: [],
        now,
      }),
    ).toMatchObject({ ok: false, reason: "missing-causal-ref" });
  });

  it("AC5: keeps the baseline immutable across roll resolution and turns", () => {
    const { anchor, session } = createHistoricalAnchorSession();
    const withRoll = requireValue(
      applyRollRequest(
        session,
        {
          kind: "roll-required",
          uncertainty: "Can they reach the keep?",
          stakes: "Time lost",
          sourceRecordIds: [],
        },
        meta,
      ),
    );
    const recordedOutcome = requireValue(
      recordPendingRollOutcome(
        withRoll,
        meta.inputId,
        { kind: "narrative", value: "Success" },
        meta,
      ),
    );
    const resolvedRoll = requireValue(
      resolveRecordedRoll(recordedOutcome, proposal(), {
        turnId: "turn-roll-1",
        inputId: "input-roll-1",
        now,
      }),
    );
    expect(resolvedRoll.historicalAnchor?.baseline).toEqual(anchor.baseline);
    const turned = requireValue(
      applyCompletedTurn(session, proposal(), meta, now),
    );
    expect(turned.historicalAnchor?.baseline).toEqual(anchor.baseline);
    expect(turned.historicalAnchor?.eventRecordId).toBe(anchor.eventRecordId);
  });

  it("AC5: accepts causally supported progress", () => {
    const { anchor, session } = createHistoricalAnchorSession();
    const diverged = transitionHistoricalAnchorProgress(session, {
      expectedRevision: 0,
      status: "diverged",
      causalRefs: [
        { kind: "turn", refId: "turn-2", summary: "Saved the king" },
      ],
      now,
    });
    expect(diverged).toMatchObject({ ok: true });
    if (!diverged.ok)
      throw new Error("Expected progress transition to succeed");
    expect(diverged.session.historicalAnchor?.progress.status).toBe("diverged");
    expect(diverged.session.revision).toBe(1);
    expect(diverged.session.historicalAnchor?.baseline).toEqual(
      anchor.baseline,
    );
  });

  it("AC6: detects Vault drift and supports revision-checked keep-baseline and rebase", () => {
    const initialEvent = kingDeathEvent();
    const created = validateAndCreateHistoricalAnchor({
      event: initialEvent,
      startDate: { year: 617, precision: "year", calendarRevision: 1 },
      calendar: zeroEraCalendar,
      now,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(
      detectHistoricalAnchorDrift(
        created.anchor,
        initialEvent,
        zeroEraCalendar,
      ),
    ).toMatchObject({ status: "clean", rebaseDecisionRequired: false });

    const missingReport = detectHistoricalAnchorDrift(
      created.anchor,
      null,
      zeroEraCalendar,
    );
    expect(missingReport.status).toBe("vault-missing");
    expect(missingReport.rebaseDecisionRequired).toBe(true);

    const modifiedEvent = kingDeathEvent({
      title: "Assassination of King Aldous",
      content: "The king was poisoned in 620.",
    });
    const modifiedReport = detectHistoricalAnchorDrift(
      created.anchor,
      modifiedEvent,
      zeroEraCalendar,
    );
    expect(modifiedReport.status).toBe("vault-modified");
    expect(modifiedReport.rebaseDecisionRequired).toBe(true);
    expect(modifiedReport.changes).toContain("title");
    expect(modifiedReport.changes).toContain("documentedFacts");

    const s: AdventureSession = {
      ...makeSession(),
      historicalAnchor: created.anchor,
    };
    const recorded = recordHistoricalAnchorDrift(s, {
      expectedRevision: 0,
      currentEventSnapshot: modifiedEvent,
      calendar: zeroEraCalendar,
      now,
    });
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;
    expect(recorded.session.historicalAnchor?.baseline).toEqual(
      created.anchor.baseline,
    );

    const kept = resolveHistoricalAnchorDrift(recorded.session, {
      expectedRevision: 1,
      decision: "keep-baseline",
      now,
    });
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    expect(kept.session.historicalAnchor?.drift.rebaseDecisionRequired).toBe(
      false,
    );
    expect(kept.session.historicalAnchor?.baseline.title).toBe(
      "Death of King Aldous",
    );

    const rebased = resolveHistoricalAnchorDrift(recorded.session, {
      expectedRevision: 1,
      decision: "rebase",
      currentEventSnapshot: modifiedEvent,
      calendar: zeroEraCalendar,
      now,
    });
    expect(rebased.ok).toBe(true);
    if (!rebased.ok) return;
    expect(rebased.session.historicalAnchor?.drift.status).toBe("clean");
    expect(rebased.session.historicalAnchor?.baseline.title).toBe(
      "Assassination of King Aldous",
    );

    // Incompatible rebase (event moved before startDate) is rejected cleanly
    const badRebase = resolveHistoricalAnchorDrift(recorded.session, {
      expectedRevision: 1,
      decision: "rebase",
      currentEventSnapshot: kingDeathEvent({
        start_date: { year: 610, precision: "year", calendarRevision: 1 },
      }),
      calendar: zeroEraCalendar,
      now,
    });
    expect(badRebase).toMatchObject({
      ok: false,
      reason: "incompatible-rebase",
    });
  });

  it("rebases against the current calendar revision with a confirmed start date", () => {
    const created = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent(),
      startDate: { year: 617, precision: "year", calendarRevision: 1 },
      calendar: zeroEraCalendar,
      now,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const currentCalendar = { ...zeroEraCalendar, revision: 2 };
    const refreshedEvent = kingDeathEvent({
      start_date: { year: 620, precision: "year", calendarRevision: 2 },
    });
    const session: AdventureSession = {
      ...makeSession(),
      historicalAnchor: created.anchor,
    };
    const rebased = resolveHistoricalAnchorDrift(session, {
      expectedRevision: 0,
      decision: "rebase",
      currentEventSnapshot: refreshedEvent,
      startDate: { year: 617, precision: "year", calendarRevision: 2 },
      calendar: currentCalendar,
      now,
    });

    expect(rebased.ok).toBe(true);
    if (!rebased.ok) return;
    expect(rebased.session.historicalAnchor?.startDate).toEqual({
      year: 617,
      precision: "year",
      calendarRevision: 2,
    });
    expect(rebased.session.historicalAnchor?.drift.status).toBe("clean");
  });

  it("AC7: keeps unrevealed anchor facts out of player projections", () => {
    const { session } = createHistoricalAnchorSession(
      kingDeathEvent({
        relevantEntityRefs: [
          {
            recordId: "char-aldous",
            recordType: "character",
            displayName: "King Aldous",
            role: "victim",
          },
        ],
      }),
      { year: 617, precision: "year", calendarRevision: 1 },
    );
    expect(projectPlayerHistoricalAnchor(makeSession())).toBeUndefined();
    const playerView = projectPlayerHistoricalAnchor(session);
    expect(playerView).toBeDefined();
    expect(playerView?.title).toBeUndefined();
    expect(playerView?.revealedFacts).toEqual([]);
    expect(JSON.stringify(playerView)).not.toContain("The king died in 620");
    expect(JSON.stringify(playerView)).not.toContain("Death of King Aldous");
    expect(JSON.stringify(playerView)).not.toContain("char-aldous");

    const gmView = projectGmHistoricalAnchor(session);
    expect(gmView?.title).toBe("Death of King Aldous");
    expect(gmView?.documentedFacts[0]?.revealed).toBe(false);
    expect(gmView?.relevantEntityRefs).toHaveLength(1);
  });

  it("AC7: detects hidden leakage and reveals only the approved fact", () => {
    const { anchor, session } = createHistoricalAnchorSession(
      kingDeathEvent({
        relevantEntityRefs: [
          {
            recordId: "char-aldous",
            recordType: "character",
            displayName: "King Aldous",
            role: "victim",
          },
        ],
      }),
      { year: 617, precision: "year", calendarRevision: 1 },
    );
    const leakyProposal = {
      ...proposal(),
      narration: "A bard sings that the king died in 620.",
    };
    expect(detectHiddenLeakage(session, leakyProposal)).toEqual([
      { field: "root.narration", secretId: "anchor-fact-1" },
    ]);
    expect(
      detectHiddenTextLeakage(session, "Whispers about Death of King Aldous."),
    ).toEqual([
      { field: "root", secretId: "anchor-entity-char-aldous-name" },
      { field: "root", secretId: HISTORICAL_ANCHOR_TITLE_SECRET_ID },
    ]);
    expect(revealedSecretIds(session, ["anchor-fact-1", "unknown-id"])).toEqual(
      ["anchor-fact-1"],
    );

    const revealedTurn = requireValue(
      applyCompletedTurn(
        session,
        { ...leakyProposal, revealSecretIds: ["anchor-fact-1"] },
        meta,
        now,
      ),
    );
    const updatedPlayerView = projectPlayerHistoricalAnchor(revealedTurn);
    expect(updatedPlayerView?.revealedFacts).toEqual([
      { id: "anchor-fact-1", text: "The king died in 620." },
    ]);
    expect(updatedPlayerView?.title).toBeUndefined();

    // Recap, transcript, and requiredGroundingSources remain safe
    const recap = buildAdventureRecap(session);
    expect(JSON.stringify(recap)).not.toContain("The king died in 620");
    const transcript = createPlayerTranscript(session);
    expect(JSON.stringify(transcript)).not.toContain("The king died in 620");
    expect(
      requiredGroundingSources(session).some(
        (ref) => ref.recordId === anchor.eventRecordId,
      ),
    ).toBe(false);
  });

  it("AC7: detects unrevealed entity references and event date details", () => {
    const { session } = createHistoricalAnchorSession(
      kingDeathEvent({
        relevantEntityRefs: [
          {
            recordId: "char-aldous",
            recordType: "character",
            displayName: "Aldous the Red",
            role: "secret witness",
          },
          { recordId: "char-ada", displayName: "Ada" },
        ],
      }),
      { year: 617, precision: "year", calendarRevision: 1 },
    );
    expect(
      detectHiddenTextLeakage(session, "Aldous the Red arrives."),
    ).toHaveLength(1);
    expect(detectHiddenTextLeakage(session, "Ada arrives.")).toHaveLength(1);
    expect(
      detectHiddenTextLeakage(session, "The event occurs in Year 620."),
    ).toHaveLength(1);
    expect(
      detectHiddenTextLeakage(session, "The calendar shows Month 3."),
    ).toHaveLength(0);
  });

  it("bounds derived facts and reuses them in anchor fingerprinting", () => {
    const content = Array.from(
      { length: 50_000 },
      (_, index) => `Fact ${index}.`,
    ).join(" ");
    const event = kingDeathEvent({ content });
    const created = validateAndCreateHistoricalAnchor({
      event,
      startDate: { year: 617, precision: "year", calendarRevision: 1 },
      calendar: zeroEraCalendar,
      now,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.anchor.baseline.documentedFacts).toHaveLength(20);
    expect(created.anchor.baseline.documentedFacts[0]?.text).toBe("Fact 0.");
  });

  it("AC8: preserves v1/v2/v3 backward compatibility and rejects future versions without mutating input", () => {
    const v1Session = {
      schemaVersion: 1,
      id: "session-v1",
      vaultId: "vault-1",
      title: "Legacy",
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastPlayedAt: now,
      revision: 0,
      playerCharacter: {
        kind: "provisional",
        name: "Mara",
        description: "Guide",
      },
      premise: "Legacy premise",
      sourceRecords: [],
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      hiddenState: { secrets: [], gmThreads: [] },
      provisionalFacts: [],
      turns: [],
      pendingRoll: null,
    };
    const parsedV1 = parseAdventureSession(v1Session);
    expect(parsedV1.schemaVersion).toBe(3);
    expect(parsedV1.historicalAnchor).toBeUndefined();

    const futureSession = { ...makeSession(), schemaVersion: 4 };
    const futureSnapshot = JSON.stringify(futureSession);
    expect(() => migrateAdventureSession(futureSession)).toThrow(
      "incompatible-version",
    );
    expect(JSON.stringify(futureSession)).toBe(futureSnapshot);

    const created = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent(),
      startDate: { year: 617, precision: "year", calendarRevision: 1 },
      calendar: zeroEraCalendar,
      now,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const futureAnchor = { ...created.anchor, version: 2 };
    const anchorSnapshot = JSON.stringify(futureAnchor);
    expect(() => migrateHistoricalAnchor(futureAnchor)).toThrow(
      "incompatible-version",
    );
    expect(() => parseHistoricalAnchor(futureAnchor)).toThrow(
      "incompatible-version",
    );
    expect(JSON.stringify(futureAnchor)).toBe(anchorSnapshot);

    const sessionWithFutureAnchor = {
      ...makeSession(),
      historicalAnchor: futureAnchor,
    };
    expect(() => parseAdventureSession(sessionWithFutureAnchor)).toThrow(
      "incompatible-version",
    );
  });
});
