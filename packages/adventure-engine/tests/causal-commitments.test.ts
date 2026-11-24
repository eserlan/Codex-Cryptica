import { describe, expect, it } from "vitest";
import { applyCompletedTurn } from "../src/completed-turn";
import { parseAdventureSession } from "../src";
import { meta, now, proposal, session } from "./reducer-fixtures";

const SUMMARY = "Mara guides travellers to fund the old mill repairs.";

function motive(summary = SUMMARY, extra: Record<string, unknown> = {}) {
  return {
    kind: "motive",
    commitmentClass: "supporting-explanation",
    subject: "Mara",
    summary,
    actorRef: { tier: "name", value: "Mara" },
    scenarioId: "scenario-1",
    ...extra,
  } as any;
}

function withCommitments(entries: unknown[]) {
  const next = proposal() as any;
  next.causalCommitments = entries;
  return next;
}

function commitmentsOf(value: any) {
  return (value.causalCommitments ?? []) as any[];
}

describe("causal commitments", () => {
  it("commits a supporting motive once with provenance, records it on the turn, and survives reload", () => {
    const current = session();
    const before = structuredClone(current);
    let id = 0;
    const result = applyCompletedTurn(
      current,
      withCommitments([motive()]),
      meta,
      now,
      () => `commitment-${++id}`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected turn");
    const commitments = commitmentsOf(result.value as any);
    expect(commitments).toHaveLength(1);
    expect(commitments[0]).toMatchObject({
      id: "commitment-1",
      kind: "motive",
      commitmentClass: "supporting-explanation",
      subject: "Mara",
      summary: SUMMARY,
      actorRef: { tier: "name", value: "Mara" },
      scenarioId: "scenario-1",
      status: "committed",
      sourceTurnId: meta.turnId,
      sourceRevision: 0,
    });
    expect((result.value.turns[0] as any).causalCommitmentIds).toEqual([
      "commitment-1",
    ]);
    expect(current).toEqual(before);
    expect(current).toEqual(session());
    const reloaded = parseAdventureSession(
      JSON.parse(JSON.stringify(result.value)),
    );
    expect(commitmentsOf(reloaded as any)).toEqual(commitments);
    expect((reloaded.turns[0] as any).causalCommitmentIds).toEqual([
      "commitment-1",
    ]);
  });

  it("dedupes the same kind, subject and scenario with the same summary on a later turn", () => {
    let id = 0;
    const createId = () => `commitment-${++id}`;
    const first = applyCompletedTurn(
      session(),
      withCommitments([motive()]),
      meta,
      now,
      createId,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("Expected turn");
    const second = applyCompletedTurn(
      first.value,
      withCommitments([motive()]),
      { turnId: "turn-2", inputId: "input-2", now },
      now,
      createId,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("Expected turn");
    const commitments = commitmentsOf(second.value as any);
    expect(commitments).toHaveLength(1);
    expect(commitments[0]).toMatchObject({
      id: "commitment-1",
      summary: SUMMARY,
      status: "committed",
    });
    expect((second.value.turns[1] as any).causalCommitmentIds ?? []).toEqual(
      [],
    );
  });

  it("keeps the original committed entry and adds a conflicting summary as contested", () => {
    let id = 0;
    const createId = () => `commitment-${++id}`;
    const first = applyCompletedTurn(
      session(),
      withCommitments([motive()]),
      meta,
      now,
      createId,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("Expected turn");
    const conflicting =
      "Mara guides travellers to scout the mill for smugglers.";
    const second = applyCompletedTurn(
      first.value,
      withCommitments([motive(conflicting)]),
      { turnId: "turn-2", inputId: "input-2", now },
      now,
      createId,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("Expected turn");
    const commitments = commitmentsOf(second.value as any);
    expect(commitments).toHaveLength(2);
    expect(commitments[0]).toMatchObject({
      id: "commitment-1",
      summary: SUMMARY,
      status: "committed",
    });
    expect(commitments[1]).toMatchObject({
      id: "commitment-2",
      summary: conflicting,
      status: "contested",
      sourceTurnId: "turn-2",
      sourceRevision: 1,
    });
    expect((second.value.turns[1] as any).causalCommitmentIds).toEqual([
      "commitment-2",
    ]);
  });

  it("persists an explicitly contested proposal as contested", () => {
    const result = applyCompletedTurn(
      session(),
      withCommitments([motive(SUMMARY, { contested: true })]),
      meta,
      now,
      () => "commitment-1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected turn");
    const commitments = commitmentsOf(result.value as any);
    expect(commitments).toHaveLength(1);
    expect(commitments[0]).toMatchObject({
      id: "commitment-1",
      status: "contested",
      sourceTurnId: meta.turnId,
    });
    expect((result.value.turns[0] as any).causalCommitmentIds).toEqual([
      "commitment-1",
    ]);
  });

  it("rejects the whole turn when a commitment id cannot be allocated", () => {
    const current = session();
    const before = structuredClone(current);
    const result = applyCompletedTurn(
      current,
      withCommitments([motive()]),
      meta,
      now,
      () => "",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("id-allocation-failed");
    }
    expect(current).toEqual(before);
    expect(current).toEqual(session());
  });

  it("rejects a turn whose narration copies a GM-only commitment verbatim", () => {
    const current = session();
    const leaky = withCommitments([motive()]);
    leaky.narration = SUMMARY;
    const result = applyCompletedTurn(current, leaky, meta, now, () => "c-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("hidden-leakage");
    expect(current).toEqual(session());
  });

  it("keeps public testimony separate from its private unverified interpretation", () => {
    const current = session();
    const testimony = "Wick says Tobiah paid him to keep the lever set.";
    const privateSummary =
      "Wick claims Tobiah gave the order; payment and motive remain unverified.";
    const proposal = withCommitments([
      motive(privateSummary, {
        commitmentClass: "belief-testimony",
        subject: "Wick",
        actorRef: { tier: "name", value: "Wick" },
      }),
    ]);
    proposal.narration = testimony;
    proposal.visiblePatch.knownFacts.add = [
      { text: testimony, source: "provisional" },
    ];

    let id = 0;
    const result = applyCompletedTurn(
      current,
      proposal,
      meta,
      now,
      () => `c-${++id}`,
    );

    expect(result.ok).toBe(true);
  });

  it("rejects a belief-testimony commitment copied verbatim into public facts", () => {
    const current = session();
    const testimony = "Wick says Tobiah paid him to keep the lever set.";
    const leaky = withCommitments([
      motive(testimony, {
        commitmentClass: "belief-testimony",
        subject: "Wick",
        actorRef: { tier: "name", value: "Wick" },
      }),
    ]);
    leaky.visiblePatch.knownFacts.add = [
      { text: testimony, source: "provisional" },
    ];

    const result = applyCompletedTurn(current, leaky, meta, now, () => "c-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("hidden-leakage");
    expect(current).toEqual(session());
  });

  it("behaves exactly as before when a proposal has no causal commitments", () => {
    const current = session();
    const result = applyCompletedTurn(
      current,
      proposal(),
      meta,
      now,
      () => "unused-1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected turn");
    expect((result.value as any).causalCommitments ?? []).toEqual([]);
    expect((result.value.turns[0] as any).causalCommitmentIds ?? []).toEqual(
      [],
    );
    expect(result.value.turns).toHaveLength(1);
    expect(current).toEqual(session());
  });
});
