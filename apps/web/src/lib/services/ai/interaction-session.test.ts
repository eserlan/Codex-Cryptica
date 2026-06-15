import { describe, it, expect, beforeEach } from "vitest";
import {
  getSession,
  resetSession,
  clearAllSessions,
  buildInteractionInput,
} from "./interaction-session";
import { loreHash, type LoreEntry } from "./lore-delta-tracker";

const entry = (id: string, title: string, body: string): LoreEntry => ({
  id,
  snippet: `--- File: ${title} ---\n${body}`,
  hash: loreHash(body),
});

describe("interaction-session", () => {
  beforeEach(() => clearAllSessions());

  it("creates and reuses a session per conversation", () => {
    const a = getSession("vault-1");
    const b = getSession("vault-1");
    expect(a).toBe(b);
    expect(getSession("vault-2")).not.toBe(a);
  });

  it("resets server-side state on demand", () => {
    const s = getSession("v");
    s.previousInteractionId = "v1_abc";
    s.tracker.commit([entry("a", "Aldric", "body")]);
    resetSession("v");
    expect(s.previousInteractionId).toBeNull();
    expect(s.tracker.isEmpty).toBe(true);
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
