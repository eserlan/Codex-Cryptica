import { describe, expect, it, vi } from "vitest";
import { GeneratorSessionManager } from "./generator-session-manager";

function mockBus() {
  let handler:
    | ((event: { type: string; payload?: Record<string, unknown> }) => void)
    | null = null;
  return {
    bus: {
      subscribe: vi.fn((_filter, listener) => {
        handler = listener;
        return vi.fn();
      }),
    },
    emit(event: { type: string; payload?: Record<string, unknown> }) {
      handler?.(event);
    },
  };
}

describe("GeneratorSessionManager", () => {
  it("starts disabled until the generator interactions flag is enabled", () => {
    const { bus } = mockBus();
    const manager = new GeneratorSessionManager(bus);

    expect(manager.enabled).toBe(false);

    manager.setEnabled(true);
    expect(manager.enabled).toBe(true);
    expect(bus.subscribe).toHaveBeenCalledWith(
      "vault:*",
      expect.any(Function),
      "generator-session-invalidation",
    );

    manager.prepare({ instruction: "Generate a faction." });
    manager.commitInteraction("interaction-1");
    manager.setEnabled(false);

    expect(manager.enabled).toBe(false);
    expect(
      manager.prepare({ instruction: "Generate an NPC." })
        .previousInteractionId,
    ).toBeNull();
  });

  it("keeps recent prompt metrics in memory and clears them on reset", () => {
    const manager = new GeneratorSessionManager();

    manager.recordPromptMetrics({
      generatorId: "npc",
      usedInteraction: true,
      replayed: false,
      fullPromptChars: 1000,
      sentPromptChars: 250,
      savedPromptChars: 750,
      estimatedFullPromptTokens: 250,
      estimatedSentPromptTokens: 63,
      estimatedSavedTokens: 187,
    });

    expect(manager.getPromptMetrics()).toEqual([
      expect.objectContaining({
        generatorId: "npc",
        savedPromptChars: 750,
      }),
    ]);

    manager.reset();

    expect(manager.getPromptMetrics()).toEqual([]);
  });

  it("bounds prompt metrics history", () => {
    const manager = new GeneratorSessionManager();

    for (let i = 0; i < 55; i++) {
      manager.recordPromptMetrics({
        generatorId: "npc",
        usedInteraction: true,
        replayed: false,
        fullPromptChars: i,
        sentPromptChars: i,
        savedPromptChars: 0,
        estimatedFullPromptTokens: i,
        estimatedSentPromptTokens: i,
        estimatedSavedTokens: 0,
      });
    }

    const metrics = manager.getPromptMetrics();
    expect(metrics).toHaveLength(50);
    expect(metrics[0].fullPromptChars).toBe(5);
  });

  it("evicts accepted entity lore when the entity is updated", () => {
    const { bus, emit } = mockBus();
    const manager = new GeneratorSessionManager(bus);
    manager.registerInvalidation();

    manager.commitAcceptedEntity({
      id: "e1",
      title: "Captain Orra",
      type: "character",
      content: "Leads the watch.",
      lore: "Accepted lore.",
      labels: ["watch"],
    });

    expect(
      manager.prepare({ instruction: "Generate an item." }).input,
    ).toContain("Captain Orra");

    emit({ type: "VAULT:ENTITY_UPDATED", payload: { id: "e1" } });

    expect(
      manager.prepare({ instruction: "Generate an item." }).input,
    ).not.toContain("Captain Orra");
  });

  it("resets thread state when the active vault changes", () => {
    const { bus, emit } = mockBus();
    const manager = new GeneratorSessionManager(bus);
    manager.registerInvalidation();

    manager.prepare({ instruction: "Generate a faction." });
    manager.commitInteraction("interaction-1");
    expect(
      manager.prepare({ instruction: "Generate an NPC." })
        .previousInteractionId,
    ).toBe("interaction-1");

    emit({ type: "VAULT:VAULT_SWITCHED" });

    expect(
      manager.prepare({ instruction: "Generate an NPC." })
        .previousInteractionId,
    ).toBeNull();
  });
});
