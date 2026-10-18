import { describe, it, expect } from "vitest";
import { DefaultTextGenerationService } from "./text-generation.service.svelte";
import { InteractionSessionManager } from "./interaction-session";

describe("DefaultTextGenerationService.resetConversation (#4059)", () => {
  const entry = { id: "e1", snippet: "--- File: Elara ---\nx", hash: "h1" };

  function setup() {
    const sessions = new InteractionSessionManager();
    const service = new DefaultTextGenerationService({} as any, sessions);
    return { sessions, service };
  }

  it("forgets the interaction id and sent lore so the next turn starts fresh", () => {
    const { sessions, service } = setup();
    const session = sessions.getSession("oracle:v1:normal");
    session.previousInteractionId = "int-1";
    session.tracker.commit([entry]);
    expect(session.tracker.partition([entry]).unchanged).toHaveLength(1);

    service.resetConversation("oracle:v1:normal");

    expect(session.previousInteractionId).toBeNull();
    expect(session.tracker.partition([entry]).newOrChanged).toHaveLength(1);
  });

  it("leaves other conversations alone", () => {
    const { sessions, service } = setup();
    sessions.getSession("oracle:v2:normal").previousInteractionId = "int-2";

    service.resetConversation("oracle:v1:normal");

    expect(sessions.getSession("oracle:v2:normal").previousInteractionId).toBe(
      "int-2",
    );
  });

  it("does nothing for a conversation that never started", () => {
    const { service } = setup();
    expect(() => service.resetConversation("oracle:none:normal")).not.toThrow();
  });
});
