import { describe, expect, it, vi } from "vitest";
import {
  createScenarioState,
  parseAdventureSession,
  type ScenarioItem,
  type ScenarioSeed,
} from "@codex/adventure-engine";
import { createAdventureRuntime } from "./adventure-fixtures";
import { extractHeardScenarios } from "../adventure-scenarios";

function item(id: string, batchId = `batch-${id}`): ScenarioItem {
  const seed: ScenarioSeed = {
    id,
    origin: { kind: "rumour", batchTitle: "Same place", batchId, index: 1 },
    playerVisible: { rumour: `Rumour ${id}`, lead: `Lead ${id}` },
    gmOnly: { truth: `Truth ${id}` },
  };
  return {
    ...createScenarioState(seed),
    knowledge: "heard",
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: { truth: `secret-${id}`, eventIds: {} },
  };
}

describe("AdventureScenarios workflow", () => {
  it("adds state locally through revision-checked persistence without calling AI", async () => {
    const { state, deps, runtime } = createAdventureRuntime();
    const generate = vi.spyOn(deps.generation, "generate");
    const added = await runtime.scenarios.add(item("one"));
    expect(added.revision).toBe(1);
    expect(added.scenarioCollection?.items[0]?.id).toBe("one");
    expect(generate).not.toHaveBeenCalled();
    expect(state.session).toEqual(added);
  });

  it("keeps prior state and propagates a failed save for retry or cancel", async () => {
    const { state, deps, runtime } = createAdventureRuntime();
    const before = state.session;
    vi.spyOn(deps.repository, "save").mockResolvedValueOnce({
      ok: false,
      error: new Error("stale-revision"),
    });
    await expect(runtime.scenarios.add(item("one"))).rejects.toThrow(
      "stale-revision",
    );
    expect(state.session).toBe(before);
  });

  it("refuses pending-roll and read-only mutations", async () => {
    const { state, runtime } = createAdventureRuntime();
    state.session!.pendingRoll = {
      id: "roll",
      inputId: "input",
      playerAction: "",
      uncertainty: "uncertain",
      stakes: "stakes",
      resolutionStatus: "awaiting-outcome",
      createdAt: "2026-08-16T12:00:00.000Z",
    };
    await expect(runtime.scenarios.add(item("one"))).rejects.toThrow(
      "pending-roll",
    );
    state.session!.pendingRoll = null;
    state.readOnly = true;
    await expect(runtime.scenarios.add(item("one"))).rejects.toThrow(
      "read-only-adventure",
    );
  });

  it("treats a same-origin retry after reload as already applied", async () => {
    const { state, runtime } = createAdventureRuntime();
    const original = item("one");
    await runtime.scenarios.add(original);
    const reloaded = parseAdventureSession(
      JSON.parse(JSON.stringify(state.session)),
    );
    state.session = reloaded;

    const retried = await runtime.scenarios.add(original);

    expect(retried.revision).toBe(reloaded.revision);
    expect(retried.scenarioCollection?.items).toHaveLength(1);
  });

  it("does not overwrite a competing simultaneous import", async () => {
    const { state, deps, runtime } = createAdventureRuntime();
    let persisted = state.session!;
    vi.spyOn(deps.repository, "save").mockImplementation(
      async (expectedRevision, next) => {
        await Promise.resolve();
        if (persisted.revision !== expectedRevision) {
          return { ok: false, error: new Error("revision-conflict") };
        }
        persisted = next;
        return { ok: true, session: next };
      },
    );

    const results = await Promise.allSettled([
      runtime.scenarios.add(item("one")),
      runtime.scenarios.add(item("two")),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(state.session?.scenarioCollection?.items).toHaveLength(1);
    expect(state.session?.revision).toBe(1);
  });

  it("closes then reopens a lead, recording each change for the player", async () => {
    const { state, runtime } = createAdventureRuntime();
    await runtime.scenarios.add(item("one"));
    await runtime.scenarios.status("one", "resolved");
    const reopened = await runtime.scenarios.status("one", "open");
    const target = reopened.scenarioCollection?.items[0];
    expect(target?.status).toBe("open");
    expect(target?.events.map((event) => event.text)).toEqual([
      "Resolved: The player marked this situation resolved.",
      "Reopened: The player reopened this situation.",
    ]);
    expect(state.session).toEqual(reopened);
  });

  it("refuses to reopen a lead that is already open", async () => {
    const { runtime } = createAdventureRuntime();
    await runtime.scenarios.add(item("one"));
    await expect(runtime.scenarios.status("one", "open")).rejects.toThrow(
      "invalid-transition",
    );
  });

  it("records a player conjecture through runtime.scenarios.recordTheory", async () => {
    const { state, runtime } = createAdventureRuntime();
    await runtime.scenarios.add(item("one"));
    const updated = await runtime.scenarios.recordTheory(
      "one",
      "I believe the mayor took the key",
    );
    expect(updated.revision).toBe(2);
    const target = updated.scenarioCollection?.items[0];
    expect(target?.events).toHaveLength(1);
    expect(target?.events[0]).toMatchObject({
      kind: "theory",
      visibility: "player",
      text: "I believe the mayor took the key",
    });
    expect(state.session).toEqual(updated);
  });

  it("persists dismissed player discoveries through reload without changing history", async () => {
    const { state, runtime } = createAdventureRuntime();
    const session = state.session!;
    session.provisionalFacts = [
      {
        id: "fact-1",
        kind: "person",
        name: "The Miller",
        summary: "Met in the village",
        introducedOnTurnId: "turn-1",
        visibility: "player-visible",
      },
      {
        id: "secret-1",
        kind: "clue",
        name: "The hidden motive",
        summary: "GM-only",
        introducedOnTurnId: "turn-1",
        visibility: "gm-only",
      },
    ];
    const beforeFacts = structuredClone(session.provisionalFacts);
    const dismissed = await runtime.scenarios.dismissDiscoveries(["fact-1"]);
    expect(dismissed.dismissedProvisionalFactIds).toEqual(["fact-1"]);
    expect(dismissed.provisionalFacts).toEqual(beforeFacts);
    expect(dismissed.turns).toEqual(session.turns);
    expect(dismissed.revision).toBe(session.revision + 1);

    // The saved JSON is the source of truth, not the component's local state.
    state.session = parseAdventureSession(
      JSON.parse(JSON.stringify(dismissed)),
    );
    expect(state.session.dismissedProvisionalFactIds).toEqual(["fact-1"]);
    const again = await runtime.scenarios.dismissDiscoveries(["fact-1"]);
    expect(again.revision).toBe(dismissed.revision);
    expect(again.dismissedProvisionalFactIds).toEqual(["fact-1"]);
  });

  it("rejects attempts to dismiss GM-only or unknown facts", async () => {
    const { state, runtime } = createAdventureRuntime();
    state.session!.provisionalFacts = [
      {
        id: "gm-only",
        kind: "clue",
        name: "Hidden plan",
        summary: "secret",
        introducedOnTurnId: "turn-1",
        visibility: "gm-only",
      },
    ];
    await expect(
      runtime.scenarios.dismissDiscoveries(["gm-only"]),
    ).rejects.toThrow("unknown-discovery");
    await expect(
      runtime.scenarios.dismissDiscoveries(["missing"]),
    ).rejects.toThrow("unknown-discovery");
    expect(state.session?.dismissedProvisionalFactIds ?? []).toEqual([]);
  });

  it("keeps a dismissed discovery available when the save fails", async () => {
    const { state, deps, runtime } = createAdventureRuntime();
    state.session!.provisionalFacts = [
      {
        id: "fact-1",
        kind: "place",
        name: "Bridge",
        summary: "Old bridge",
        introducedOnTurnId: "turn-1",
        visibility: "player-visible",
      },
    ];
    const before = state.session;
    vi.spyOn(deps.repository, "save").mockResolvedValueOnce({
      ok: false,
      error: new Error("revision-conflict"),
    });
    await expect(
      runtime.scenarios.dismissDiscoveries(["fact-1"]),
    ).rejects.toThrow("revision-conflict");
    expect(state.session).toBe(before);
    expect(state.session?.dismissedProvisionalFactIds ?? []).toEqual([]);
  });

  it("ties a saved place to its Vault record and keeps the link on a failed save", async () => {
    const { state, deps, runtime } = createAdventureRuntime();
    state.session!.places = [{ id: "place-1", name: "Bridge" }];
    const linked = await runtime.scenarios.linkPlaceRecord("Bridge", "rec-9");
    expect(linked.places?.[0]?.sourceRecordId).toBe("rec-9");
    expect(linked.revision).toBe(state.session!.revision);

    state.session!.places = [{ id: "place-2", name: "Mill" }];
    const before = state.session;
    vi.spyOn(deps.repository, "save").mockResolvedValueOnce({
      ok: false,
      error: new Error("revision-conflict"),
    });
    await expect(
      runtime.scenarios.linkPlaceRecord("Mill", "rec-1"),
    ).rejects.toThrow("revision-conflict");
    expect(state.session).toBe(before);
    expect(state.session?.places?.[0]?.sourceRecordId).toBeUndefined();
  });

  it("extracts heard scenarios safely from session or returns empty list", () => {
    expect(extractHeardScenarios(null)).toEqual([]);
    expect(extractHeardScenarios(undefined)).toEqual([]);

    const session = {
      scenarioCollection: {
        items: [
          { id: "h1", knowledge: "heard" },
          { id: "u1", knowledge: "unheard" },
        ],
      },
    } as any;
    expect(extractHeardScenarios(session)).toEqual([
      { id: "h1", knowledge: "heard" },
    ]);
  });
});
