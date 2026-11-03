import { describe, expect, it, vi } from "vitest";
import { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
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
    await manager.start({
      ...startInput,
      playerCharacter: { kind: "canonical", recordId: "pc", name: "Mara" },
    });
    for (let turn = 0; turn < 30; turn += 1) {
      if (turn === 12) {
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
      await manager.submitAction(
        turn >= 12 ? "Return to the bridge" : `Explore ${turn}`,
      );
      if (manager.session?.pendingRoll) {
        await manager.recordRollOutcome({ kind: "numeric", value: 16 });
      }
      if (turn === 15) {
        const saved = JSON.parse(JSON.stringify(manager.session));
        await manager.close();
        deps.repository.load = async () => ({
          condition: "normal",
          session: saved,
        });
        manager = new AdventureManager(deps);
        await manager.open(saved.vaultId, saved.id);
      }
    }
    assertContinuity(manager, search);
  });
});

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

function assertContinuity(
  manager: AdventureManager,
  search: ReturnType<typeof vi.fn>,
) {
  expect(manager.session?.turns).toHaveLength(31);
  expect(manager.session?.pendingRoll).toBeNull();
  expect(
    manager.session?.turns.filter((turn) => turn.rollOutcome?.value === 16),
  ).toHaveLength(1);
  expect(manager.session?.provisionalFacts).toEqual([
    expect.objectContaining({ name: "Observed lock" }),
  ]);
  const publicTranscript = JSON.stringify(manager.transcript);
  expect(publicTranscript).not.toContain("keeper hides a spare key");
  expect(search.mock.calls.length).toBeGreaterThanOrEqual(32);
}
