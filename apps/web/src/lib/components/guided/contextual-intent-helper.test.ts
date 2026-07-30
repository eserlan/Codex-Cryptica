import { describe, it, expect } from "vitest";
import { resolveIntentContext } from "./contextual-intent-helper";

describe("resolveIntentContext", () => {
  it("maps standard intent categories to their generator id and auto-generates", () => {
    expect(resolveIntentContext("character").generatorId).toBe("npc");
    expect(resolveIntentContext("place").generatorId).toBe("settlement");
    expect(resolveIntentContext("faction").generatorId).toBe("faction");
    expect(resolveIntentContext("event").generatorId).toBe("event");
    expect(resolveIntentContext("item").generatorId).toBe("magic-item");
    expect(resolveIntentContext("character").autoGenerate).toBe(true);
  });

  it("leaves custom without a generator id and does not auto-generate", () => {
    const result = resolveIntentContext("custom");
    expect(result.generatorId).toBeNull();
    expect(result.autoGenerate).toBe(false);
  });

  it("infers the active entity as source context when present", () => {
    const result = resolveIntentContext("character", {
      activeEntity: { id: "e-1", title: "Oakhaven", type: "location" },
    });
    expect(result.sourceEntityId).toBe("e-1");
  });

  it("has no source entity context when nothing is active", () => {
    const result = resolveIntentContext("faction");
    expect(result.sourceEntityId).toBeNull();
  });
});
