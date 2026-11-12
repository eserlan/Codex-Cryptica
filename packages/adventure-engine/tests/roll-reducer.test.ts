import { describe, expect, it } from "vitest";
import {
  applyRollRequest,
  dismissPendingRoll,
  recordPendingRollOutcome,
  resolveRecordedRoll,
} from "../src/roll-reducer";
import { meta, proposal, session } from "./reducer-fixtures";
import type { RollRequiredProposal } from "../src/types";
const request: RollRequiredProposal = {
  kind: "roll-required",
  uncertainty: "The bridge may fall",
  stakes: "Lose the trail",
  sourceRecordIds: [],
  dice: {
    expression: "d6",
    outcomeBands: [{ id: "success", minimum: 4, label: "Success" }],
  },
};
function pendingSession() {
  const pending = applyRollRequest(session(), request, meta);
  if (!pending.ok) throw new Error("Expected pending roll");
  return pending.value;
}

describe("roll transitions", () => {
  it("records and resolves exactly one outcome with its dice snapshot", () => {
    const current = session();
    const pending = applyRollRequest(current, request, meta);
    if (!pending.ok) throw new Error("Expected pending roll");
    expect(current.pendingRoll).toBeNull();
    expect(pending.value.pendingRoll).toMatchObject({
      inputId: meta.inputId,
      resolutionStatus: "awaiting-outcome",
      dice: { expression: "d6", bands: request.dice!.outcomeBands },
    });
    const outcome = {
      kind: "numeric" as const,
      value: 5,
      parts: [{ type: "dice" as const, sides: 6, rolls: [5], value: 5 }],
    };
    const recorded = recordPendingRollOutcome(
      pending.value,
      meta.inputId,
      outcome,
      meta,
    );
    if (!recorded.ok) throw new Error("Expected recorded outcome");
    expect(pending.value.pendingRoll?.suppliedOutcome).toBeUndefined();
    expect(recorded.value.revision).toBe(2);
    expect(recorded.value.pendingRoll?.resolutionStatus).toBe(
      "ready-to-resolve",
    );
    expect(
      recordPendingRollOutcome(recorded.value, meta.inputId, outcome, meta).ok,
    ).toBe(false);
    expect(dismissPendingRoll(recorded.value, meta.inputId, meta).ok).toBe(
      false,
    );
    const resolved = resolveRecordedRoll(recorded.value, proposal(), meta);
    if (!resolved.ok) throw new Error("Expected resolved turn");
    expect(resolved.value.revision).toBe(3);
    expect(resolved.value.pendingRoll).toBeNull();
    expect(resolved.value.turns[0]?.resolvedRoll).toEqual({
      expression: "d6",
      bands: request.dice!.outcomeBands,
      outcome,
    });
    expect(recorded.value.pendingRoll?.suppliedOutcome).toEqual(outcome);
  });

  it("dismisses an unrecorded roll without adding a turn", () => {
    const pending = pendingSession();
    const result = dismissPendingRoll(pending, meta.inputId, meta);
    expect(result.ok && result.value.pendingRoll).toBeNull();
    expect(result.ok && result.value.turns).toEqual([]);
    expect(result.ok && result.value.revision).toBe(2);
    expect(pending.pendingRoll).not.toBeNull();
  });

  it("rejects unavailable, mismatched, and unsafe requests", () => {
    const pending = pendingSession();
    expect(applyRollRequest(pending, request, meta).ok).toBe(false);
    expect(
      applyRollRequest({ ...session(), status: "archived" }, request, meta).ok,
    ).toBe(false);
    expect(applyRollRequest(session(), proposal(), meta).ok).toBe(false);
    const current = session();
    current.hiddenState.secrets = [
      { id: "secret", text: "The bridge may fall", status: "hidden" },
    ];
    expect(applyRollRequest(current, request, meta)).toEqual({
      ok: false,
      errors: [
        {
          code: "hidden-leakage",
          message: "The response contains unrevealed GM information.",
        },
      ],
    });
    expect(
      recordPendingRollOutcome(
        pending,
        "wrong",
        { kind: "numeric", value: 1 },
        meta,
      ).ok,
    ).toBe(false);
    expect(dismissPendingRoll(pending, "wrong", meta).ok).toBe(false);
    expect(dismissPendingRoll(session(), meta.inputId, meta).ok).toBe(false);
    expect(resolveRecordedRoll(pending, proposal(), meta).ok).toBe(false);
  });

  it("retains a recorded roll when its completed turn is rejected", () => {
    const recorded = recordPendingRollOutcome(
      pendingSession(),
      meta.inputId,
      { kind: "numeric", value: 1 },
      meta,
    );
    if (!recorded.ok) throw new Error("Expected recorded roll");
    const before = structuredClone(recorded.value);
    const next = proposal();
    next.revealSecretIds = ["unknown"];
    const failed = resolveRecordedRoll(recorded.value, next, meta);
    expect(!failed.ok && failed.errors[0]?.code).toBe("unknown-secret");
    expect(recorded.value).toEqual(before);
  });
});
