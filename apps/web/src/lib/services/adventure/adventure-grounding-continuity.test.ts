import { describe, expect, it, vi } from "vitest";
import { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
import {
  createScenarioState,
  type ScenarioItem,
} from "@codex/adventure-engine";
import {
  dependencies,
  completeProposal,
  rollProposal,
  startInput,
} from "#lib/stores/oracle/tests/adventure-fixtures.js";
import { AdventureContextService } from "./adventure-context-service";

/** Deterministic source-delivery/commit test, not a claim about live-model secrecy. */
describe("grounded existing-world continuity", () => {
  it("preserves sources, discovered facts and one supplied roll through 30 turns, retry, revisit and reload", async () => {
    const { deps, generate, search, setLookupFailure } = continuityFixture();
    let manager = new AdventureManager(deps);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: true },
    });
    await manager.start({
      ...startInput,
      playerCharacter: { kind: "canonical", recordId: "pc", name: "Mara" },
      sourceRecords: [
        {
          recordId: "pc",
          recordType: "character",
          displayName: "Mara",
          role: "player-character",
          availability: "available",
        },
      ],
    });
    expect(manager.errorMessage).toBeNull();
    const situations = ["bridge-rumour", "keeper-secret", "flooded-cellar"].map(
      (id) => scenario(id),
    );
    for (const item of situations) await manager.addScenario(item);
    expect(manager.session?.scenarioCollection?.items).toHaveLength(3);
    expect(
      manager.session?.scenarioCollection?.items.every(
        (item) => item.knowledge === "unheard",
      ),
    ).toBe(true);
    manager = await runContinuityTurns(
      manager,
      deps,
      generate,
      setLookupFailure,
    );
    assertContinuity(manager, search);
  });
});

async function runContinuityTurns(
  manager: AdventureManager,
  deps: any,
  generate: ReturnType<typeof vi.fn>,
  setLookupFailure: (failed: boolean) => void,
): Promise<AdventureManager> {
  for (let turn = 0; turn < 30; turn += 1) {
    if (turn === 12)
      await verifyLookupFailure(manager, generate, setLookupFailure);
    manager = await playContinuityTurn(manager, turn, deps);
  }
  return manager;
}

async function verifyLookupFailure(
  manager: AdventureManager,
  generate: ReturnType<typeof vi.fn>,
  setLookupFailure: (failed: boolean) => void,
): Promise<void> {
  const before = JSON.stringify(manager.session);
  const calls = generate.mock.calls.length;
  setLookupFailure(true);
  await manager.submitAction("Return to the bridge");
  expect(manager.errorMessage).toContain("Unable to load world context");
  expect(manager.errorMessage).not.toContain("private storage details");
  expect(manager.draft).toBe("Return to the bridge");
  expect(JSON.stringify(manager.session)).toBe(before);
  expect(generate).toHaveBeenCalledTimes(calls);
  setLookupFailure(false);
}

async function playContinuityTurn(
  manager: AdventureManager,
  turn: number,
  deps: any,
): Promise<AdventureManager> {
  await manager.submitAction(
    turn >= 12 ? "Return to the bridge" : `Explore ${turn}`,
  );
  if (turn === 0) await focusHeardSituation(manager);
  if (manager.session?.pendingRoll) {
    await manager.recordRollOutcome({ kind: "numeric", value: 16 });
  }
  return turn === 15 ? reloadAndResolveSituation(manager, deps) : manager;
}

async function focusHeardSituation(manager: AdventureManager): Promise<void> {
  const heard = manager.session?.scenarioCollection?.items.find(
    (item) => item.knowledge === "heard",
  );
  if (!heard) throw new Error("expected a heard situation");
  await manager.focusScenario(heard.id);
  await manager.focusScenario(null);
}

async function reloadAndResolveSituation(
  manager: AdventureManager,
  deps: any,
): Promise<AdventureManager> {
  const saved = JSON.parse(JSON.stringify(manager.session));
  await manager.close();
  deps.repository.load = async () => ({ condition: "normal", session: saved });
  const reloaded = new AdventureManager(deps);
  await reloaded.open(saved.vaultId, saved.id);
  const heard = reloaded.session?.scenarioCollection?.items.find(
    (item) => item.knowledge === "heard",
  );
  if (!heard) throw new Error("expected a heard situation after reload");
  await reloaded.focusScenario(heard.id);
  await reloaded.setScenarioStatus(heard.id, "resolved");
  return reloaded;
}

function continuityFixture() {
  const deps: any = dependencies();
  let id = 0;
  deps.idGenerator = () => `continuity-${++id}`;
  deps.clearGenerationInteraction = async () => {};
  let lookupFailed = false;
  const search = vi.fn(async () => {
    if (lookupFailed) throw new Error("private storage details");
    return [
      {
        id: "bridge",
        title: "Bridge",
        type: "location",
        text: "The bridge closes at dusk.",
        lore: "The keeper hides a spare key.",
      },
    ];
  });
  deps.context = new AdventureContextService({
    getById: async (_vault, recordId) => ({
      id: recordId,
      title: "Mara",
      type: "character",
      text: "Mara grew up here.",
    }),
    search,
  });
  let actionNumber = 0;
  const generate = vi.fn(async (request: any) => {
    expect(request.anchors).toEqual([
      expect.objectContaining({ recordId: "pc" }),
    ]);
    expect(request.relevant).toEqual([
      expect.objectContaining({ recordId: "bridge" }),
    ]);
    if (request.phase === "action") {
      actionNumber += 1;
      if (actionNumber === 8) return rollProposal;
      if (actionNumber === 1) {
        const first = request.session.scenarioCollection?.items[0];
        if (first)
          return { ...completeProposal, revealScenarioIds: [first.id] };
      }
      if (actionNumber === 4)
        return {
          ...completeProposal,
          provisionalFacts: [
            {
              kind: "clue",
              name: "Observed lock",
              summary: "The gate has a brass lock.",
              visibility: "player-visible",
            },
          ],
        };
    }
    return completeProposal;
  });
  deps.generation = { generate };

  return {
    deps,
    generate,
    search,
    setLookupFailure: (failed: boolean) => {
      lookupFailed = failed;
    },
  };
}

function scenario(id: string): ScenarioItem {
  return {
    ...createScenarioState({
      id,
      origin: { kind: "manual", manualId: `continuity-${id}` },
      playerVisible: { rumour: `Rumour ${id}`, lead: `Lead ${id}` },
      gmOnly: { truth: `Hidden truth ${id}` },
    }),
    knowledge: "unheard",
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: { truth: `truth-${id}`, eventIds: {} },
  };
}

function assertContinuity(
  manager: AdventureManager,
  search: ReturnType<typeof vi.fn>,
) {
  expect(manager.session?.turns).toHaveLength(31);
  expect(manager.session?.pendingRoll).toBeNull();
  expect(manager.session?.scenarioCollection?.items).toHaveLength(3);
  expect(
    manager.session?.scenarioCollection?.items.filter(
      (item) => item.knowledge === "heard",
    ),
  ).toHaveLength(1);
  expect(
    manager.session?.scenarioCollection?.items.filter(
      (item) => item.knowledge === "unheard",
    ),
  ).toHaveLength(2);
  expect(
    manager.session?.scenarioCollection?.items.filter(
      (item) => item.status === "resolved",
    ),
  ).toHaveLength(1);
  expect(
    manager.session?.scenarioCollection?.items[0]?.events.filter(
      (event) => event.kind === "status-change",
    ),
  ).toHaveLength(1);
  expect(
    manager.session?.turns.filter((turn) => turn.rollOutcome?.value === 16),
  ).toHaveLength(1);
  expect(manager.session?.provisionalFacts).toEqual([
    expect.objectContaining({ name: "Observed lock" }),
  ]);
  const publicTranscript = JSON.stringify(manager.transcript);
  expect(publicTranscript).not.toContain("keeper hides a spare key");
  for (const item of manager.session!.scenarioCollection!.items.filter(
    (scenario) => scenario.knowledge === "unheard",
  )) {
    expect(publicTranscript).not.toContain(item.gmOnly.truth);
  }
  expect(search.mock.calls.length).toBeGreaterThanOrEqual(32);
}
