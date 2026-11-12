import { describe, expect, it } from "vitest";
import { buildAdventurePrompt } from "@codex/adventure-engine";
import { AdventureInteractionContext } from "./adventure-interaction-context";
import { buildAdventureInteractionInput } from "./adventure-interaction-input";
import { session } from "./adventure-generation.test-fixtures";

describe("adventure continuation payloads", () => {
  const source = {
    recordId: "town",
    displayName: "Town",
    content: "A quiet town",
    role: "anchor" as const,
  };
  const request = {
    session,
    phase: "opening" as const,
    anchors: [source],
    relevant: [source],
  };

  it("keeps full state and transcript for a fresh context and deduplicates source entries", () => {
    const context = new AdventureInteractionContext().get(session.id);
    const prompt = buildAdventurePrompt(request);
    const prepared = buildAdventureInteractionInput(
      prompt,
      context,
      "Repair the JSON",
    );
    expect(prepared.sourceEntries).toHaveLength(1);
    expect(prepared.sourceEntries[0]).toMatchObject({
      id: "town",
      snippet: JSON.stringify(prompt.anchors[0]),
    });
    expect(JSON.parse(prepared.input)).toMatchObject({
      state: prepared.state,
      responseRepair: "Repair the JSON",
    });
    expect(JSON.parse(prepared.input)).toHaveProperty("transcript");
  });

  it("sends new sources and changed state, marks removals null, and omits retained transcript", () => {
    const context = new AdventureInteractionContext().get(session.id);
    const prompt = buildAdventurePrompt(request);
    const initial = buildAdventureInteractionInput(prompt, context);
    context.previousInteractionId = "saved";
    context.stateSnapshot = {
      ...initial.state,
      removedField: "old",
      playerVisibleState: "old value",
    };
    context.tracker.commit(initial.sourceEntries);
    const extra = { ...source, recordId: "road", content: "A winding road" };
    const next = buildAdventureInteractionInput(
      buildAdventurePrompt({ ...request, relevant: [extra] }),
      context,
    );
    const payload = JSON.parse(next.input);
    expect(payload.anchors).toEqual([]);
    expect(
      payload.relevant.map((entry: { recordId: string }) => entry.recordId),
    ).toEqual(["road"]);
    expect(payload.retainedSourceIds).toEqual(["town"]);
    expect(payload.stateDelta).toMatchObject({
      removedField: null,
      playerVisibleState: initial.state.playerVisibleState,
    });
    expect(payload).not.toHaveProperty("state");
    expect(payload).not.toHaveProperty("transcript");
    expect(payload).not.toHaveProperty("responseRepair");
  });
});
