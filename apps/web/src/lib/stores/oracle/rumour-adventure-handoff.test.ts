import { describe, expect, it } from "vitest";
import { playerScenarioProjection } from "@codex/adventure-engine";
import { generateRumourLocal, selectRumourForPlay } from "generator-engine";
import {
  RumourAdventureHandoff,
  buildRumourScenario,
} from "./rumour-adventure-handoff.svelte";

const source = generateRumourLocal({}, () => 0.42);
const selected = selectRumourForPlay(source, 4);

describe("RumourAdventureHandoff", () => {
  it("retains only a selected rumour and matching GM truth within its Vault", () => {
    const handoff = new RumourAdventureHandoff();
    const scenario = buildRumourScenario(selected, "scenario-4");
    handoff.prepare("vault-1", selected, scenario);

    expect(handoff.forVault("vault-2")).toBeNull();
    const pending = handoff.forVault("vault-1");
    expect(pending?.scenario.origin.index).toBe(4);
    expect(pending?.scenario.gmOnly.truth).toBe(
      selected.gmOnly.whatsActuallyHappening,
    );
    expect(pending?.scenario.gmOnly.ifInvestigated).toContain(
      selected.gmOnly.ifInvestigated,
    );
    const publicProjection = JSON.stringify(
      playerScenarioProjection(pending!.scenario),
    );
    expect(publicProjection).not.toContain(
      selected.gmOnly.whatsActuallyHappening,
    );
    expect(publicProjection).not.toContain(selected.gmOnly.ifInvestigated);

    handoff.clear();
    expect(handoff.forVault("vault-1")).toBeNull();
  });

  it("clones its inputs so callers cannot overwrite prepared secrets", () => {
    const handoff = new RumourAdventureHandoff();
    const selectedCopy = structuredClone(selected);
    const scenario = buildRumourScenario(selectedCopy, "scenario-original");
    handoff.prepare("vault-1", selectedCopy, scenario);

    scenario.gmOnly.truth = "mutable caller input";
    selectedCopy.gmOnly.whatsActuallyHappening = "changed after prepare";
    expect(handoff.forVault("vault-1")?.scenario.gmOnly.truth).toBe(
      selected.gmOnly.whatsActuallyHappening,
    );
  });

  it("rejects missing vault IDs without retaining secrets", () => {
    const handoff = new RumourAdventureHandoff();
    expect(() =>
      handoff.prepare("", selected, buildRumourScenario(selected, "x")),
    ).toThrow("No active vault");
    expect(handoff.pending).toBeNull();
  });
});
