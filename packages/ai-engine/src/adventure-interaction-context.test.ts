import { describe, expect, it } from "vitest";
import { buildAdventurePrompt } from "@codex/adventure-engine";
import { AdventureInteractionContext } from "./adventure-interaction-context";
import { buildAdventureInteractionInput } from "./adventure-interaction-input";
import { session } from "./adventure-generation.test-fixtures";

const request = {
  session,
  phase: "opening" as const,
  anchors: [],
  relevant: [],
};

function pending(context: AdventureInteractionContext, revision = 0) {
  const prompt = buildAdventurePrompt(request);
  const interaction = context.get(session.id);
  const prepared = buildAdventureInteractionInput(prompt, interaction);
  interaction.pending = {
    ...prepared,
    id: "reply",
    modelName: "luna-fast",
    revision,
  };
  return interaction;
}

describe("adventure retained conversation context", () => {
  it("acknowledges only saved proposals and follows deterministic local revisions", () => {
    const context = new AdventureInteractionContext();
    const interaction = pending(context);
    expect(interaction.previousInteractionId).toBeNull();
    context.confirm(session.id, 1);
    expect(interaction).toMatchObject({
      previousInteractionId: "reply",
      revision: 1,
      successfulTurns: 1,
      pending: null,
    });
    context.confirm(session.id, 2);
    expect(interaction.revision).toBe(2);
    expect(
      context.prepare(
        { ...session, revision: 2 },
        buildAdventurePrompt(request),
        "luna-fast",
      ),
    ).toBe(interaction);
    context.confirm("missing", 1);
  });

  it("discards proposals saved at an unexpected revision and clears explicitly", () => {
    const context = new AdventureInteractionContext();
    const interaction = pending(context);
    context.confirm(session.id, 3);
    expect(context.get(session.id)).not.toBe(interaction);
    const fresh = context.get(session.id);
    context.clear(session.id);
    expect(context.get(session.id)).not.toBe(fresh);
  });

  it.each(["pending", "model", "revision", "refresh"])(
    "starts a clean context after %s invalidation",
    (reason) => {
      const context = new AdventureInteractionContext();
      const interaction = context.get(session.id);
      if (reason === "pending") pending(context);
      if (reason === "model") interaction.modelName = "another-model";
      if (reason === "revision") interaction.revision = 5;
      if (reason === "refresh") interaction.successfulTurns = 80;
      expect(
        context.prepare(session, buildAdventurePrompt(request), "luna-fast"),
      ).not.toBe(interaction);
    },
  );

  it("commits source hashes and resets only when retained canonical text changes", () => {
    const context = new AdventureInteractionContext();
    const source = {
      recordId: "town",
      displayName: "Town",
      role: "anchor" as const,
      content: "Old town",
    };
    const prompt = buildAdventurePrompt({ ...request, anchors: [source] });
    const interaction = context.get(session.id);
    const prepared = buildAdventureInteractionInput(prompt, interaction);
    interaction.pending = {
      ...prepared,
      id: "reply",
      modelName: "luna-fast",
      revision: 0,
    };
    context.confirm(session.id);
    const saved = { ...session, revision: 1 };
    expect(context.prepare(saved, prompt, "luna-fast")).toBe(interaction);
    expect(interaction.sourceHashes.has("town")).toBe(true);
    const changed = buildAdventurePrompt({
      ...request,
      anchors: [{ ...source, content: "Burned town" }],
    });
    expect(context.prepare(saved, changed, "luna-fast")).not.toBe(interaction);
  });
});
