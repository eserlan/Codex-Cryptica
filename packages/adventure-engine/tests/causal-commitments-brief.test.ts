import { describe, expect, it } from "vitest";
import {
  MAX_DIRECTOR_BRIEF_CHARS,
  buildGMDirectorBrief,
  createScenarioState,
  parseAdventureSession,
  playerScenarioCollectionProjection,
  projectVisibleState,
  type AdventureSession,
  type CausalCommitment,
  type ScenarioItem,
} from "../src";
import { session as baseSession } from "./reducer-fixtures";

// Contract (#5111 brief integration): CausalCommitment already exists on the
// session (kind/commitmentClass/status/sourceTurnId/sourceRevision); only the
// GMDirectorBrief surfacing is under test, hence `as any` on new brief fields.

function makeScenario(id: string): ScenarioItem {
  const base = createScenarioState({
    id,
    origin: { kind: "manual", manualId: `manual-${id}` },
    playerVisible: {
      rumour: `Rumour about ${id}`,
      lead: `Lead for ${id}`,
      source: `Source ${id}`,
    },
    gmOnly: {
      truth: `GM-TRUTH-${id}: hidden truth`,
      ifInvestigated: `GM-INVESTIGATED-${id}: hidden clue`,
    },
  });
  return {
    ...base,
    knowledge: "heard",
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: {
      truth: `truth-${id}`,
      ifInvestigated: `inv-${id}`,
      eventIds: {},
    },
  };
}

function commitment(
  overrides: Partial<CausalCommitment> = {},
): CausalCommitment {
  return {
    id: "cc-1",
    kind: "motive",
    commitmentClass: "supporting-explanation",
    subject: "Maren's motive",
    summary: "COMMITTED-MOTIVE: Maren hid the ledger to protect her brother.",
    status: "committed",
    sourceTurnId: "turn-1",
    sourceRevision: 1,
    scenarioId: "scen-motive",
    ...overrides,
  };
}

function sessionWith(
  commitments: CausalCommitment[],
  scenarioId?: string,
): AdventureSession {
  const s = baseSession();
  if (scenarioId) {
    s.scenarioCollection = {
      version: 1,
      items: [makeScenario(scenarioId)],
      focusedScenarioId: scenarioId,
    };
  }
  s.causalCommitments = commitments;
  return s;
}

function briefFor(session: AdventureSession): any {
  return buildGMDirectorBrief({ session, phase: "opening" }) as any;
}

function playerVisibleJson(session: AdventureSession): string {
  return JSON.stringify([
    projectVisibleState(session),
    playerScenarioCollectionProjection(session),
  ]);
}

describe("causal commitments in GMDirectorBrief", () => {
  it("(1) surfaces a committed supporting motive in established.committedExplanations after reload", () => {
    const s = sessionWith([commitment()], "scen-motive");
    // Simulated reload: plain JSON round-trip, re-parsed, brief rebuilt.
    const reloaded = parseAdventureSession(
      JSON.parse(JSON.stringify(s)) as unknown,
    );
    expect((reloaded as any).causalCommitments).toHaveLength(1);

    const brief = briefFor(reloaded);
    expect(brief).toBeDefined();
    expect(brief.pursuedScenarios.map((p: any) => p.scenarioId)).toEqual([
      "scen-motive",
    ]);
    const established =
      brief.pursuedScenarios[0].established.committedExplanations;
    expect(Array.isArray(established)).toBe(true);
    expect(established.length).toBe(1);
    expect(JSON.stringify(established)).toContain("COMMITTED-MOTIVE");
    // Player-facing projection never contains commitment summary text.
    expect(playerVisibleJson(reloaded)).not.toContain("COMMITTED-MOTIVE");
  });

  it("(2) keeps contested commitments nowhere in the brief (or player projection)", () => {
    const s = sessionWith(
      [
        commitment(),
        commitment({
          id: "cc-contested-1",
          summary: "CONTESTED-SECRET: the ferryman burned the ledger.",
          status: "contested",
        }),
        commitment({
          id: "cc-contested-2",
          commitmentClass: "belief-testimony",
          kind: "identity",
          summary: "CONTESTED-BELIEF: Venn swears the miller lied.",
          status: "contested",
        }),
      ],
      "scen-motive",
    );
    const briefJson = JSON.stringify(briefFor(s));
    expect(briefJson).toContain("COMMITTED-MOTIVE");
    expect(briefJson).not.toContain("CONTESTED-SECRET");
    expect(briefJson).not.toContain("CONTESTED-BELIEF");
    expect(playerVisibleJson(s)).not.toContain("CONTESTED-SECRET");
    expect(playerVisibleJson(s)).not.toContain("COMMITTED-MOTIVE");
  });

  it("(3) puts belief-testimony/speculative-plan only under potential.speculativeCommitments", () => {
    const s = sessionWith(
      [
        commitment(),
        commitment({
          id: "cc-belief",
          commitmentClass: "belief-testimony",
          kind: "identity",
          summary: "BELIEF-ONLY: Venn believes the miller took the grain.",
        }),
        commitment({
          id: "cc-plan",
          commitmentClass: "speculative-plan",
          kind: "action",
          summary: "PLAN-ONLY: the watch may search the mill at dawn.",
        }),
      ],
      "scen-motive",
    );
    const pursued = briefFor(s).pursuedScenarios[0];
    const speculative = pursued.potential.speculativeCommitments;
    expect(Array.isArray(speculative)).toBe(true);
    expect(JSON.stringify(speculative)).toContain("BELIEF-ONLY");
    expect(JSON.stringify(speculative)).toContain("PLAN-ONLY");
    // Not established, in either its dedicated field or anywhere else there.
    expect(JSON.stringify(pursued.established)).not.toContain("BELIEF-ONLY");
    expect(JSON.stringify(pursued.established)).not.toContain("PLAN-ONLY");
    expect(JSON.stringify(pursued.established.committedExplanations)).toContain(
      "COMMITTED-MOTIVE",
    );
  });

  it("(4) surfaces scenario-less committed explanations at top level when no scenario is pursued", () => {
    const s = sessionWith([
      commitment({ id: "cc-free-1", scenarioId: undefined }),
      commitment({
        id: "cc-free-2",
        scenarioId: undefined,
        summary: "FREE-TWO: the flood, not theft, emptied the storehouse.",
      }),
      commitment({
        id: "cc-free-3",
        scenarioId: undefined,
        summary: "FREE-THREE: the old road was closed before the fire.",
      }),
      commitment({
        id: "cc-free-4",
        scenarioId: undefined,
        summary: "FREE-FOUR: this fourth explanation should be capped.",
      }),
      commitment({
        id: "cc-scoped",
        scenarioId: "scen-elsewhere",
        summary: "SCOPED-ELSEWHERE: must not surface unscoped.",
      }),
    ]);
    const brief = briefFor(s);
    expect(brief.pursuedScenarios).toEqual([]);
    const top = brief.committedExplanations;
    expect(Array.isArray(top)).toBe(true);
    expect(top.length).toBeLessThanOrEqual(3);
    expect(top.length).toBeGreaterThan(0);
    expect(JSON.stringify(top)).toContain("COMMITTED-MOTIVE");
    expect(JSON.stringify(brief)).not.toContain("SCOPED-ELSEWHERE");
  });

  it("(5) keeps the brief within 2400 chars with many long commitments", () => {
    const many: CausalCommitment[] = Array.from({ length: 20 }, (_, i) =>
      commitment({
        id: `cc-many-${i}`,
        commitmentClass:
          i % 3 === 0
            ? "belief-testimony"
            : i % 3 === 1
              ? "speculative-plan"
              : "supporting-explanation",
        summary: `MANY-${i}: ${"a very long causal explanation ".repeat(12)}`,
      }),
    );
    const brief = briefFor(sessionWith(many, "scen-motive"));
    expect(brief).toBeDefined();
    expect(JSON.stringify(brief).length).toBeLessThanOrEqual(2400);
    expect(JSON.stringify(brief).length).toBeLessThanOrEqual(
      MAX_DIRECTOR_BRIEF_CHARS,
    );
    const pursued = brief.pursuedScenarios[0];
    expect(
      pursued.established.committedExplanations.length,
    ).toBeLessThanOrEqual(3);
    expect(pursued.potential.speculativeCommitments.length).toBeGreaterThan(0);
    // Text is clipped, not embedded verbatim at full length.
    expect(JSON.stringify(pursued.established)).not.toContain(
      "a very long causal explanation ".repeat(12).trim(),
    );
  });
});
