import { describe, expect, it } from "vitest";
import {
  addScenario,
  appendScenarioEvent,
  buildAdventureRecap,
  createScenarioState,
  parseAdventureSession,
  playerScenarioCollectionProjection,
  recordScenarioTheory,
  setScenarioFocus,
  setScenarioStatus,
} from "../src";
import type { AdventureSession, ScenarioItem, ScenarioSeed } from "../src";

const at = "2026-11-01T10:00:00.000Z";
const seed = (
  id: string,
  batchId: string,
  truth = `Truth ${id}`,
): ScenarioSeed => ({
  id,
  origin: { kind: "rumour", batchTitle: "Same title", batchId, index: 1 },
  playerVisible: { rumour: `Rumour ${id}`, lead: `Lead ${id}` },
  gmOnly: { truth },
});

function item(
  s: ScenarioSeed,
  knowledge: ScenarioItem["knowledge"] = "heard",
): ScenarioItem {
  return {
    ...createScenarioState(s),
    knowledge,
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: { truth: `secret-${s.id}`, eventIds: {} },
  };
}

function session(): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 3,
    id: "adv",
    vaultId: "vault",
    title: "World",
    status: "active",
    createdAt: at,
    updatedAt: at,
    lastPlayedAt: at,
    revision: 4,
    playerCharacter: { kind: "provisional", name: "A", description: "B" },
    premise: "P",
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
    dicePresets: [],
    resourceCounters: [],
    scenarioCollection: {
      version: 1,
      items: [item(seed("one", "batch-one"))],
      focusedScenarioId: "one",
    },
  });
}

describe("scenario collection commands", () => {
  it("adds independent situations without replacing another baseline and treats exact retry as a no-op", () => {
    const before = session();
    const added = addScenario(before, item(seed("two", "batch-two")), 4);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.session.scenarioCollection?.items).toHaveLength(2);
    expect(added.session.scenarioCollection?.items[0]?.gmOnly.truth).toBe(
      "Truth one",
    );
    expect(
      addScenario(added.session, item(seed("two", "batch-two")), 5),
    ).toMatchObject({ ok: true, changed: false });
    expect(
      addScenario(
        added.session,
        item(seed("other", "batch-two", "Changed truth")),
        5,
      ),
    ).toMatchObject({ ok: false, reason: "origin-conflict" });
  });

  it("allows only heard open targets to focus and terminal status clears focus", () => {
    const initial = session();
    expect(setScenarioFocus(initial, "missing", 4)).toMatchObject({
      ok: false,
      reason: "unknown-scenario",
    });
    const unheard = addScenario(
      initial,
      item(seed("hidden", "batch-hidden"), "unheard"),
      4,
    );
    expect(unheard.ok).toBe(true);
    if (!unheard.ok) return;
    expect(setScenarioFocus(unheard.session, "hidden", 5)).toMatchObject({
      ok: false,
      reason: "scenario-not-heard",
    });
    const resolved = setScenarioStatus(unheard.session, "one", "resolved", 5);
    expect(resolved).toMatchObject({ ok: true });
    if (resolved.ok)
      expect(resolved.session.scenarioCollection?.focusedScenarioId).toBeNull();
    expect(initial.scenarioCollection?.items[0]?.status).toBe("open");
  });

  it("reopens a closed lead with a player-visible event, without restoring focus", () => {
    const event = (id: string) => ({
      id,
      kind: "status-change" as const,
      visibility: "player" as const,
      text: "The player changed this situation.",
      at,
    });
    const closed = setScenarioStatus(
      session(),
      "one",
      "resolved",
      4,
      event("evt-close"),
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    const reopened = setScenarioStatus(
      closed.session,
      "one",
      "open",
      closed.session.revision,
      event("evt-reopen"),
    );
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    const target = reopened.session.scenarioCollection!.items[0];
    expect(target.status).toBe("open");
    expect(target.events.map((e) => e.text)).toEqual([
      "Resolved: The player changed this situation.",
      "Reopened: The player changed this situation.",
    ]);
    expect(reopened.session.scenarioCollection?.focusedScenarioId).toBeNull();
    // The abandoned path reopens the same way.
    const left = setScenarioStatus(session(), "one", "abandoned", 4);
    expect(left.ok).toBe(true);
    if (left.ok)
      expect(
        setScenarioStatus(left.session, "one", "open", left.session.revision),
      ).toMatchObject({ ok: true });
  });

  it("rejects transitions that are not open-to-closed or closed-to-open", () => {
    const base = session();
    // open -> open and open -> unknown value
    expect(setScenarioStatus(base, "one", "open", 4)).toMatchObject({
      ok: false,
      reason: "invalid-transition",
    });
    expect(setScenarioStatus(base, "one", "paused" as never, 4)).toMatchObject({
      ok: false,
      reason: "invalid-transition",
    });
    const closed = setScenarioStatus(base, "one", "resolved", 4);
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    const rev = closed.session.revision;
    // closed -> closed, in both directions
    expect(
      setScenarioStatus(closed.session, "one", "abandoned", rev),
    ).toMatchObject({ ok: false, reason: "invalid-transition" });
    expect(
      setScenarioStatus(closed.session, "one", "resolved", rev),
    ).toMatchObject({ ok: false, reason: "invalid-transition" });
    // a stale revision and an unheard lead still cannot reopen or close
    expect(
      setScenarioStatus(closed.session, "one", "open", rev - 1),
    ).toMatchObject({ ok: false, reason: "stale-revision" });
  });

  it("does not change state for stale, pending-roll or overflowing commands", () => {
    const original = session();
    expect(
      addScenario(original, item(seed("two", "batch-two")), 3),
    ).toMatchObject({ ok: false, reason: "stale-revision" });
    expect(
      addScenario(
        {
          ...original,
          pendingRoll: {
            id: "r",
            inputId: "i",
            playerAction: "",
            uncertainty: "u",
            stakes: "s",
            resolutionStatus: "awaiting-outcome",
            createdAt: at,
          },
        },
        item(seed("two", "batch-two")),
        4,
      ),
    ).toMatchObject({ ok: false, reason: "pending-roll" });
    const full = parseAdventureSession({
      ...original,
      scenarioCollection: {
        ...original.scenarioCollection!,
        items: Array.from({ length: 8 }, (_, i) =>
          item(seed(`s${i}`, `b${i}`)),
        ),
        focusedScenarioId: "s0",
      },
    });
    expect(addScenario(full, item(seed("ninth", "ninth")), 4)).toMatchObject({
      ok: false,
      reason: "state-budget-exceeded",
    });
    expect(original.scenarioCollection?.items).toHaveLength(1);
  });

  it("accepts maximum-length IDs and rejects a 161-character ID", () => {
    const maximumId = "x".repeat(160);
    const bounded = item(seed(maximumId, "batch-max"));
    bounded.origin = { kind: "manual", manualId: "m".repeat(160) };
    bounded.anchorRefs = Array.from(
      { length: 12 },
      (_, index) => `${String(index).padStart(3, "0")}${"a".repeat(157)}`,
    );
    bounded.secretBindings.truth = "s".repeat(160);
    expect(() =>
      parseAdventureSession({
        ...session(),
        scenarioCollection: {
          version: 1,
          items: [bounded],
          focusedScenarioId: null,
        },
      }),
    ).not.toThrow();

    expect(() =>
      parseAdventureSession({
        ...session(),
        scenarioCollection: {
          version: 1,
          items: [{ ...bounded, id: `${maximumId}x` }],
          focusedScenarioId: null,
        },
      }),
    ).toThrow();
  });

  it("replays an identical event without a revision and rejects a different payload under that ID", () => {
    const original = session();
    const event = {
      id: "event-one",
      kind: "discovery" as const,
      visibility: "player" as const,
      text: "Fresh tracks",
      at,
    };
    const first = appendScenarioEvent(original, "one", event, 4);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(appendScenarioEvent(first.session, "one", event, 5)).toMatchObject({
      ok: true,
      changed: false,
    });
    expect(
      appendScenarioEvent(
        first.session,
        "one",
        { ...event, text: "Different tracks" },
        5,
      ),
    ).toMatchObject({ ok: false, reason: "id-collision" });
    expect(original.scenarioCollection?.items[0]?.events).toEqual([]);
  });

  it("records a player conjecture/theory on heard scenarios and rejects unheard scenarios or blanks", () => {
    const heardSession = session();
    const unheardResult = addScenario(
      heardSession,
      item(seed("two", "batch-two"), "unheard"),
      4,
    );
    expect(unheardResult.ok).toBe(true);
    if (!unheardResult.ok) return;

    // Reject on unheard scenario
    const rejectUnheard = recordScenarioTheory(
      unheardResult.session,
      "two",
      "The priest is covering something up",
      "theory-1",
      unheardResult.session.revision,
    );
    expect(rejectUnheard).toMatchObject({
      ok: false,
      reason: "scenario-not-heard",
    });

    // Reject on empty or whitespace conjecture
    const rejectBlank = recordScenarioTheory(
      unheardResult.session,
      "one",
      "   ",
      "theory-2",
      unheardResult.session.revision,
    );
    expect(rejectBlank).toMatchObject({
      ok: false,
      reason: "invalid-scenario",
    });

    // Successfully records theory on heard scenario
    const accepted = recordScenarioTheory(
      unheardResult.session,
      "one",
      "The miller was seen leaving before dawn",
      "theory-3",
      unheardResult.session.revision,
      at,
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    const targetItem = accepted.session.scenarioCollection?.items.find(
      (entry) => entry.id === "one",
    );
    expect(targetItem?.events).toHaveLength(1);
    expect(targetItem?.events[0]).toMatchObject({
      id: "theory-3",
      kind: "theory",
      visibility: "player",
      text: "The miller was seen leaving before dawn",
      at,
    });

    // Visible in player projection
    const projected = playerScenarioCollectionProjection(accepted.session);
    const projectedItem = projected.items.find((entry) => entry?.id === "one");
    expect(projectedItem?.events[0]).toMatchObject({
      id: "theory-3",
      kind: "theory",
      text: "The miller was seen leaving before dawn",
    });
  });

  it("includes player-safe knownLeads and elapsedTimeLabel in buildAdventureRecap without leaking secrets", () => {
    let s = session();
    s = {
      ...s,
      worldTime: {
        version: 1,
        elapsedMinutes: 150,
        events: [
          {
            id: "private-evt",
            turnId: "turn-1",
            atMinute: 60,
            threadId: "gm-thread",
            text: "Private GM update",
          },
        ],
      },
    };
    const addUnheard = addScenario(
      s,
      item(seed("unheard-lead", "batch-u", "Secret Truth 99"), "unheard"),
      s.revision,
    );
    expect(addUnheard.ok).toBe(true);
    if (!addUnheard.ok) return;
    s = addUnheard.session;

    const focused = setScenarioFocus(s, "one", s.revision);
    expect(focused.ok).toBe(true);
    if (!focused.ok) return;
    s = focused.session;

    const recap = buildAdventureRecap(s);
    expect(recap.elapsedTimeLabel).toBe("2h 30m");
    expect(recap.knownLeads).toHaveLength(1);
    expect(recap.knownLeads?.[0]).toEqual({
      id: "one",
      lead: "Lead one",
      status: "open",
      focused: true,
      lastUpdate: undefined,
    });

    // Verify no private GM data leaked
    const serialised = JSON.stringify(recap);
    expect(serialised).not.toContain("unheard-lead");
    expect(serialised).not.toContain("Secret Truth 99");
    expect(serialised).not.toContain("Private GM update");
  });
});
