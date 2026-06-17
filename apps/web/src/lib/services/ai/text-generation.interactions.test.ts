import { describe, it, expect, beforeEach, vi } from "vitest";
vi.mock("./capability-guard", () => ({
  isAIEnabled: vi.fn(() => true),
  assertAIEnabled: vi.fn(),
}));

import { DefaultTextGenerationService } from "./text-generation.service.svelte";
import { InteractionExpiredError } from "./client-manager";
import { interactionSessions } from "./interaction-session";
import { entityContentHash, type LoreEntry } from "@codex/oracle-engine";

const entry = (id: string, title: string, body: string): LoreEntry => ({
  id,
  snippet: `--- File: ${title} ---\n${body}`,
  hash: entityContentHash(body),
});

function makeService(sendInteraction: any) {
  // Minimal fake client manager exposing only what the interaction path uses.
  return new DefaultTextGenerationService({ sendInteraction } as any);
}

function makeRevisionService(sendInteraction: any, generateContent?: any) {
  const model = {
    generateContent:
      generateContent ||
      vi.fn().mockResolvedValue({
        response: {
          text: () => '{"content":"updated","lore":"updated lore"}',
        },
      }),
  };
  return new DefaultTextGenerationService({
    sendInteraction,
    getModel: vi.fn().mockResolvedValue(model),
  } as any);
}

const opts = (loreEntries: LoreEntry[], interactionsEnabled = true) => ({
  conversationId: "vault-1",
  loreEntries,
  interactionsEnabled,
});

describe("generateResponse — Interactions API path", () => {
  beforeEach(() => {
    interactionSessions.clearAllSessions();
  });

  it("sends full lore on the first turn, only the delta on the next", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ id: "v1_1", text: "First answer" })
      .mockResolvedValueOnce({ id: "v1_2", text: "Second answer" });
    const svc = makeService(send);

    const aldric = entry("a", "Aldric", "A knight.");
    const onUpdate = vi.fn();

    await svc.generateResponse(
      "", // no api key -> proxy path
      "Who is Aldric?",
      [],
      "ignored-context",
      "gemini-3-flash-preview",
      onUpdate,
      false,
      [],
      opts([aldric]),
    );

    expect(onUpdate).toHaveBeenCalledWith("First answer");
    expect(send.mock.calls[0][0].input).toContain("A knight.");
    expect(send.mock.calls[0][0].previousInteractionId).toBeNull();

    // Second turn: same lore unchanged -> stripped; previous id threaded.
    await svc.generateResponse(
      "",
      "And his weapon?",
      [],
      "ignored-context",
      "gemini-3-flash-preview",
      onUpdate,
      false,
      [],
      opts([aldric]),
    );

    expect(send.mock.calls[1][0].previousInteractionId).toBe("v1_1");
    expect(send.mock.calls[1][0].input).not.toContain("A knight.");
    expect(send.mock.calls[1][0].input).toContain(
      "[RELEVANT EARLIER RECORDS] Aldric",
    );
  });

  it("resends a record whose body changed", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ id: "v1_1", text: "a" })
      .mockResolvedValueOnce({ id: "v1_2", text: "b" });
    const svc = makeService(send);

    await svc.generateResponse(
      "",
      "q1",
      [],
      "",
      "m",
      vi.fn(),
      false,
      [],
      opts([entry("a", "Aldric", "A knight.")]),
    );
    await svc.generateResponse(
      "",
      "q2",
      [],
      "",
      "m",
      vi.fn(),
      false,
      [],
      opts([entry("a", "Aldric", "A knight, now a king.")]),
    );

    expect(send.mock.calls[1][0].input).toContain("now a king");
  });

  it("replays full history + lore once when the interaction id expires", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ id: "v1_1", text: "ok" })
      .mockRejectedValueOnce(new InteractionExpiredError("expired"))
      .mockResolvedValueOnce({ id: "v1_new", text: "recovered" });
    const svc = makeService(send);
    const aldric = entry("a", "Aldric", "A knight.");
    const onUpdate = vi.fn();

    await svc.generateResponse(
      "",
      "q1",
      [],
      "ctx",
      "m",
      vi.fn(),
      false,
      [],
      opts([aldric]),
    );

    await svc.generateResponse(
      "",
      "q2",
      [
        { role: "user", content: "q1" },
        { role: "assistant", content: "ok" },
      ],
      "VAULT LORE BLOB",
      "m",
      onUpdate,
      false,
      [],
      opts([aldric]),
    );

    // Third send is the replay: no previous id, includes transcript + full lore.
    const replay = send.mock.calls[2][0];
    expect(replay.previousInteractionId).toBeNull();
    expect(replay.input).toContain("[CONVERSATION SO FAR]");
    expect(replay.input).toContain("A knight.");
    expect(onUpdate).toHaveBeenCalledWith("recovered");
  });

  it("is a no-op (falls through) when the flag is disabled", async () => {
    const send = vi.fn();
    const svc = makeService(send);
    // Flag passed per-call (off): the interaction path must NOT be taken.
    // No api key + no model client -> getModel path will throw; we only assert
    // that sendInteraction was never called.
    await svc
      .generateResponse(
        "",
        "q",
        [],
        "",
        "m",
        vi.fn(),
        false,
        [],
        opts([], false),
      )
      .catch(() => {});
    expect(send).not.toHaveBeenCalled();
  });
});

describe("reviseEntityUpdate — Interactions API path", () => {
  beforeEach(() => {
    interactionSessions.clearAllSessions();
  });

  it("sends full related context first, then only the retained hint on the next revision", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        id: "r1",
        text: '{"content":"one","lore":"first"}',
      })
      .mockResolvedValueOnce({
        id: "r2",
        text: '{"content":"two","lore":"second"}',
      });
    const svc = makeRevisionService(send);
    const related = [
      {
        id: "szass",
        title: "Szass Tam",
        type: "npc",
        relation: "rules",
        summary: "The lich-regent of Thay.",
      },
    ];

    await svc.reviseEntityUpdate!(
      "",
      "m",
      { id: "thay", title: "Thay", type: "location", content: "", lore: "" },
      { chronicle: "c1", lore: "l1" },
      related,
      [],
      { interactionsEnabled: true },
    );
    await svc.reviseEntityUpdate!(
      "",
      "m",
      { id: "thay", title: "Thay", type: "location", content: "", lore: "" },
      { chronicle: "c2", lore: "l2" },
      related,
      [],
      { interactionsEnabled: true },
    );

    expect(send.mock.calls[0][0].input).toContain(
      "<USER_CONTENT>\nSzass Tam (npc) [rules]: The lich-regent of Thay.\n</USER_CONTENT>",
    );
    expect(send.mock.calls[1][0].previousInteractionId).toBe("r1");
    expect(send.mock.calls[1][0].input).not.toContain("The lich-regent of Thay.");
    expect(send.mock.calls[1][0].input).toContain(
      "[RELEVANT EARLIER RECORDS] Szass Tam (npc) [rules]",
    );
  });

  it("replays the full related context once after interaction expiry", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        id: "r1",
        text: '{"content":"one","lore":"first"}',
      })
      .mockRejectedValueOnce(new InteractionExpiredError("expired"))
      .mockResolvedValueOnce({
        id: "r2",
        text: '{"content":"two","lore":"second"}',
      });
    const svc = makeRevisionService(send);
    const related = [
      {
        id: "aglarond",
        title: "Aglarond",
        type: "location",
        summary: "A realm hostile to Thayan expansion.",
      },
    ];

    await svc.reviseEntityUpdate!(
      "",
      "m",
      { id: "thay", title: "Thay", type: "location", content: "", lore: "" },
      { chronicle: "c1", lore: "l1" },
      related,
      [],
      { interactionsEnabled: true },
    );
    await svc.reviseEntityUpdate!(
      "",
      "m",
      { id: "thay", title: "Thay", type: "location", content: "", lore: "" },
      { chronicle: "c2", lore: "l2" },
      related,
      [],
      { interactionsEnabled: true },
    );

    expect(send.mock.calls[2][0].previousInteractionId).toBeNull();
    expect(send.mock.calls[2][0].input).toContain(
      "<USER_CONTENT>\nAglarond (location): A realm hostile to Thayan expansion.\n</USER_CONTENT>",
    );
  });

  it("re-sends a related entity after it is invalidated mid-session", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        id: "r1",
        text: '{"content":"one","lore":"first"}',
      })
      .mockResolvedValueOnce({
        id: "r2",
        text: '{"content":"two","lore":"second"}',
      });
    const svc = makeRevisionService(send);
    const related = [
      {
        id: "szass",
        title: "Szass Tam",
        type: "npc",
        summary: "The lich-regent of Thay.",
      },
    ];

    await svc.reviseEntityUpdate!(
      "",
      "m",
      { id: "thay", title: "Thay", type: "location", content: "", lore: "" },
      { chronicle: "c1", lore: "l1" },
      related,
      [],
      { interactionsEnabled: true },
    );

    interactionSessions.evictEntity("szass");

    await svc.reviseEntityUpdate!(
      "",
      "m",
      { id: "thay", title: "Thay", type: "location", content: "", lore: "" },
      { chronicle: "c2", lore: "l2" },
      related,
      [],
      { interactionsEnabled: true },
    );

    expect(send.mock.calls[1][0].input).toContain(
      "<USER_CONTENT>\nSzass Tam (npc): The lich-regent of Thay.\n</USER_CONTENT>",
    );
  });

  it("falls back to the stateless revision path when a personal API key is present", async () => {
    const send = vi.fn();
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => '{"content":"updated","lore":"updated lore"}',
      },
    });
    const svc = makeRevisionService(send, generateContent);

    await svc.reviseEntityUpdate!(
      "personal-key",
      "m",
      { id: "thay", title: "Thay", type: "location", content: "", lore: "" },
      { chronicle: "c1", lore: "l1" },
      [],
      [],
      { interactionsEnabled: true },
    );

    expect(send).not.toHaveBeenCalled();
    expect(generateContent).toHaveBeenCalledOnce();
  });
});
