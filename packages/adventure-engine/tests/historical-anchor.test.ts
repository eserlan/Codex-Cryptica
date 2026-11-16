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
  type HistoricalEventSnapshot,
} from "../src";
import { meta, now, proposal, session as makeSession } from "./reducer-fixtures";

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
    expect(prompt.behavior).toContain(
      'Historical anchor policy is "preserve"',
    );
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

  it("AC5: enforces revision-safe progress, causality, and immutable baseline across turns/rolls", () => {
    const created = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent({
        start_date: {
          year: 620,
          precision: "day",
          unitId: "m2",
          day: 15,
          calendarRevision: 1,
        },
      }),
      startDate: {
        year: 620,
        precision: "day",
        unitId: "m1",
        day: 1,
        calendarRevision: 1,
      },
      calendar: zeroEraCalendar,
      policy: "preserve",
      now,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const baseSession: AdventureSession = {
      ...makeSession(),
      historicalAnchor: created.anchor,
    };

    // Derive progress from elapsed fictional minutes
    expect(deriveHistoricalAnchorProgress(baseSession, zeroEraCalendar)).toBe(
      "upcoming",
    );
    expect(
      deriveHistoricalAnchorProgress(
        {
          ...baseSession,
          worldTime: { version: 1, elapsedMinutes: 20 * 1440, events: [] },
        },
        zeroEraCalendar,
      ),
    ).toBe("approaching");
    expect(
      deriveHistoricalAnchorProgress(
        {
          ...baseSession,
          worldTime: { version: 1, elapsedMinutes: 44 * 1440, events: [] },
        },
        zeroEraCalendar,
      ),
    ).toBe("reached");
    expect(
      deriveHistoricalAnchorProgress(baseSession, {
        ...zeroEraCalendar,
        revision: 9,
      }),
    ).toBe("unresolved");

    // Reject stale revision
    expect(
      transitionHistoricalAnchorProgress(baseSession, {
        expectedRevision: 99,
        status: "approaching",
        causalRefs: [{ kind: "world-time", refId: "wt-1", atMinute: 28800 }],
        now,
      }),
    ).toMatchObject({ ok: false, reason: "stale-revision" });

    // Reject archived session
    expect(
      transitionHistoricalAnchorProgress(
        { ...baseSession, status: "archived" },
        {
          expectedRevision: 0,
          status: "approaching",
          causalRefs: [{ kind: "world-time", refId: "wt-1" }],
          now,
        },
      ),
    ).toMatchObject({ ok: false, reason: "read-only-session" });

    // Reject pending roll
    const withRoll = applyRollRequest(
      baseSession,
      {
        kind: "roll-required",
        uncertainty: "Can they reach the keep?",
        stakes: "Time lost",
        sourceRecordIds: [],
      },
      meta,
    );
    expect(withRoll.ok).toBe(true);
    if (!withRoll.ok) return;
    expect(
      transitionHistoricalAnchorProgress(withRoll.value, {
        expectedRevision: withRoll.value.revision,
        status: "approaching",
        causalRefs: [{ kind: "turn", refId: "turn-1" }],
        now,
      }),
    ).toMatchObject({ ok: false, reason: "pending-roll" });

    // Record & resolve roll -> baseline stays immutable
    const recordedOutcome = recordPendingRollOutcome(
      withRoll.value,
      meta.inputId,
      { kind: "narrative", value: "Success" },
      meta,
    );
    expect(recordedOutcome.ok).toBe(true);
    if (!recordedOutcome.ok) return;

    const resolvedRoll = resolveRecordedRoll(
      recordedOutcome.value,
      proposal(),
      { turnId: "turn-roll-1", inputId: "input-roll-1", now },
    );
    expect(resolvedRoll.ok).toBe(true);
    if (!resolvedRoll.ok) return;
    expect(resolvedRoll.value.historicalAnchor?.baseline).toEqual(
      created.anchor.baseline,
    );

    // Reject missing causalRefs
    expect(
      transitionHistoricalAnchorProgress(baseSession, {
        expectedRevision: 0,
        status: "diverged",
        causalRefs: [],
        now,
      }),
    ).toMatchObject({ ok: false, reason: "missing-causal-ref" });

    // Valid diverged transition
    const diverged = transitionHistoricalAnchorProgress(baseSession, {
      expectedRevision: 0,
      status: "diverged",
      causalRefs: [{ kind: "turn", refId: "turn-2", summary: "Saved the king" }],
      now,
    });
    expect(diverged.ok).toBe(true);
    if (!diverged.ok) return;
    expect(diverged.session.historicalAnchor?.progress.status).toBe("diverged");
    expect(diverged.session.revision).toBe(1);

    // applyCompletedTurn never overwrites baseline
    const turned = applyCompletedTurn(baseSession, proposal(), meta, now);
    expect(turned.ok).toBe(true);
    if (!turned.ok) return;
    expect(turned.value.historicalAnchor?.baseline).toEqual(
      created.anchor.baseline,
    );
    expect(turned.value.historicalAnchor?.eventRecordId).toBe(
      created.anchor.eventRecordId,
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
    expect(
      kept.session.historicalAnchor?.drift.rebaseDecisionRequired,
    ).toBe(false);
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
    expect(badRebase).toMatchObject({ ok: false, reason: "incompatible-rebase" });
  });

  it("AC7: isolates unrevealed anchor facts from player projections and guards leakage", () => {
    const created = validateAndCreateHistoricalAnchor({
      event: kingDeathEvent({
        relevantEntityRefs: [
          {
            recordId: "char-aldous",
            recordType: "character",
            displayName: "King Aldous",
            role: "victim",
          },
        ],
      }),
      startDate: { year: 617, precision: "year", calendarRevision: 1 },
      calendar: zeroEraCalendar,
      now,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const s: AdventureSession = {
      ...makeSession(),
      historicalAnchor: created.anchor,
    };

    expect(projectPlayerHistoricalAnchor(makeSession())).toBeUndefined();
    const playerView = projectPlayerHistoricalAnchor(s);
    expect(playerView).toBeDefined();
    expect(playerView?.title).toBeUndefined();
    expect(playerView?.revealedFacts).toEqual([]);
    expect(JSON.stringify(playerView)).not.toContain("The king died in 620");
    expect(JSON.stringify(playerView)).not.toContain("Death of King Aldous");
    expect(JSON.stringify(playerView)).not.toContain("char-aldous");

    const gmView = projectGmHistoricalAnchor(s);
    expect(gmView?.title).toBe("Death of King Aldous");
    expect(gmView?.documentedFacts[0]?.revealed).toBe(false);
    expect(gmView?.relevantEntityRefs).toHaveLength(1);

    // Leakage detection
    const leakyProposal = {
      ...proposal(),
      narration: "A bard sings that the king died in 620.",
    };
    expect(detectHiddenLeakage(s, leakyProposal)).toEqual([
      { field: "root.narration", secretId: "anchor-fact-1" },
    ]);
    expect(
      detectHiddenTextLeakage(s, "Whispers about Death of King Aldous."),
    ).toEqual([{ field: "root", secretId: HISTORICAL_ANCHOR_TITLE_SECRET_ID }]);
    expect(revealedSecretIds(s, ["anchor-fact-1", "unknown-id"])).toEqual([
      "anchor-fact-1",
    ]);

    // Revealing in same turn succeeds and exposes only that fact
    const revealedTurn = applyCompletedTurn(
      s,
      { ...leakyProposal, revealSecretIds: ["anchor-fact-1"] },
      meta,
      now,
    );
    expect(revealedTurn.ok).toBe(true);
    if (!revealedTurn.ok) return;

    const updatedPlayerView = projectPlayerHistoricalAnchor(revealedTurn.value);
    expect(updatedPlayerView?.revealedFacts).toEqual([
      { id: "anchor-fact-1", text: "The king died in 620." },
    ]);
    expect(updatedPlayerView?.title).toBeUndefined();

    // Recap, transcript, and requiredGroundingSources remain safe
    const recap = buildAdventureRecap(s);
    expect(JSON.stringify(recap)).not.toContain("The king died in 620");
    const transcript = createPlayerTranscript(s);
    expect(JSON.stringify(transcript)).not.toContain("The king died in 620");
    expect(
      requiredGroundingSources(s).some(
        (ref) => ref.recordId === created.anchor.eventRecordId,
      ),
    ).toBe(false);
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
