import { describe, it, expect } from "vitest";
import { InteractionSessionManager } from "./interaction-session";
import { buildInteractionInput, loreHash } from "@codex/oracle-engine";
import type { LoreEntry } from "@codex/oracle-engine";

const entry = (id: string, title: string, body: string): LoreEntry => ({
  id,
  snippet: `--- File: ${title} ---\n${body}`,
  hash: loreHash(body),
});

describe("InteractionSessionManager", () => {
  it("creates and reuses a session per conversation", () => {
    const mgr = new InteractionSessionManager();
    const a = mgr.getSession("vault-1");
    const b = mgr.getSession("vault-1");
    expect(a).toBe(b);
    expect(mgr.getSession("vault-2")).not.toBe(a);
  });

  it("resets server-side state on demand", () => {
    const mgr = new InteractionSessionManager();
    const s = mgr.getSession("v");
    s.previousInteractionId = "v1_abc";
    s.tracker.commit([entry("a", "Aldric", "body")]);
    mgr.resetSession("v");
    expect(s.previousInteractionId).toBeNull();
    expect(s.tracker.isEmpty).toBe(true);
  });

  it("wires invalidation through an injected bus when enabled", () => {
    let handler: ((e: any) => void) | undefined;
    const bus = {
      subscribe: (_f: string, l: (e: any) => void) => {
        handler = l;
        return () => {};
      },
    };
    const mgr = new InteractionSessionManager(bus);
    mgr.getSession("v").tracker.commit([entry("e1", "X", "body")]);
    mgr.setEnabled(true);

    handler?.({ type: "VAULT:ENTITY_UPDATED", payload: { id: "e1" } });
    expect(
      mgr.getSession("v").tracker.partition([entry("e1", "X", "body")])
        .newOrChanged,
    ).toHaveLength(1);
  });
});

describe("buildInteractionInput", () => {
  it("includes new/changed lore and the query", () => {
    const input = buildInteractionInput("Who is Aldric?", {
      newOrChanged: [entry("a", "Aldric", "A knight.")],
      unchanged: [],
    });
    expect(input).toContain("[VAULT LORE CONTEXT]");
    expect(input).toContain("A knight.");
    expect(input).toContain("[USER QUERY]\nWho is Aldric?");
  });

  it("emits a relevance hint for unchanged records and omits their bodies", () => {
    const input = buildInteractionInput("And his castle?", {
      newOrChanged: [],
      unchanged: [entry("b", "Ravenhold", "A fortress.")],
    });
    expect(input).toContain("[RELEVANT EARLIER RECORDS] Ravenhold");
    expect(input).not.toContain("A fortress.");
    expect(input).not.toContain("[VAULT LORE CONTEXT]");
  });

  it("skips the style block in the relevance hint", () => {
    const input = buildInteractionInput("hi", {
      newOrChanged: [],
      unchanged: [{ id: "__style__", snippet: "GLOBAL ART STYLE", hash: "x" }],
    });
    expect(input).not.toContain("RELEVANT EARLIER RECORDS");
  });
});
