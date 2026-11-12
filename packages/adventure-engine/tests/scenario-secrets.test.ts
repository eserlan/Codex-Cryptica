import { describe, expect, it } from "vitest";
import {
  applySecretReveals,
  hasImmutableScenarioRewrite,
} from "../src/scenario-secrets";
import { now, proposal, scenario, session } from "./reducer-fixtures";

describe("scenario secret transitions", () => {
  it("guards truth, investigation text and bound GM events, while allowing identical updates", () => {
    const current = session();
    const item = scenario();
    item.events = [
      {
        id: "event",
        kind: "consequence",
        visibility: "gm",
        text: "The smugglers leave",
        at: now,
      },
    ];
    item.secretBindings.eventIds = { event: "event-secret" };
    current.scenarioCollection = {
      version: 1,
      items: [item],
      focusedScenarioId: null,
    };
    for (const [id, text] of [
      ["truth-1", item.gmOnly.truth],
      ["investigated-1", item.gmOnly.ifInvestigated!],
      ["event-secret", item.events[0]!.text],
    ]) {
      const next = proposal();
      next.hiddenPatch.secrets.update = [
        { id: id!, text: text!, status: "hidden" },
      ];
      expect(hasImmutableScenarioRewrite(current, next)).toBe(false);
      next.hiddenPatch.secrets.update[0]!.text = "Replacement";
      expect(hasImmutableScenarioRewrite(current, next)).toBe(true);
    }
    expect(hasImmutableScenarioRewrite(session(), proposal())).toBe(false);
  });

  it("reveals legacy and structured secrets once, including structured-only bindings", () => {
    const candidate = session();
    candidate.scenarioCollection = {
      version: 1,
      items: [scenario()],
      focusedScenarioId: null,
    };
    const secrets = [
      { id: "legacy", text: "Hidden", status: "hidden" as const },
    ];
    expect(
      applySecretReveals(
        candidate,
        secrets,
        ["legacy", "truth-1", "truth-1"],
        "turn-1",
      ),
    ).toBeNull();
    expect(secrets[0]).toEqual({
      id: "legacy",
      text: "Hidden",
      status: "revealed",
      revealedOnTurnId: "turn-1",
    });
    expect(candidate.scenarioCollection.items[0]?.revealedSecretIds).toEqual([
      "truth-1",
    ]);
    expect(applySecretReveals(candidate, secrets, ["missing"], "turn-2")).toBe(
      "Unknown secret: missing",
    );
  });
});
