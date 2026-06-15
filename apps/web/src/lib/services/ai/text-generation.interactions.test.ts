import { describe, it, expect, beforeEach, vi } from "vitest";
import { DefaultTextGenerationService } from "./text-generation.service.svelte";
import { InteractionExpiredError } from "./client-manager";
import {
  setInteractionsEnabled,
  clearAllSessions,
} from "./interaction-session";
import { loreHash, type LoreEntry } from "./lore-delta-tracker";

const entry = (id: string, title: string, body: string): LoreEntry => ({
  id,
  snippet: `--- File: ${title} ---\n${body}`,
  hash: loreHash(body),
});

function makeService(sendInteraction: any) {
  // Minimal fake client manager exposing only what the interaction path uses.
  return new DefaultTextGenerationService({ sendInteraction } as any);
}

const opts = (loreEntries: LoreEntry[]) => ({
  conversationId: "vault-1",
  loreEntries,
});

describe("generateResponse — Interactions API path", () => {
  beforeEach(() => {
    clearAllSessions();
    setInteractionsEnabled(true);
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
    setInteractionsEnabled(false);
    const send = vi.fn();
    const svc = makeService(send);
    // No api key + no model client -> getModel path will throw; we only assert
    // that the interaction path was NOT taken.
    await svc
      .generateResponse("", "q", [], "", "m", vi.fn(), false, [], opts([]))
      .catch(() => {});
    expect(send).not.toHaveBeenCalled();
  });
});
