import { describe, it, expect, beforeEach } from "vitest";
import {
  getSession,
  evictEntity,
  clearAllSessions,
} from "./interaction-session";
import { loreHash, type LoreEntry } from "./lore-delta-tracker";

const entry = (id: string, body: string): LoreEntry => ({
  id,
  snippet: `--- File: ${id} ---\n${body}`,
  hash: loreHash(body),
});

describe("lore eviction (Phase 5.1)", () => {
  beforeEach(() => clearAllSessions());

  it("evicts a record from every conversation so it is re-sent", () => {
    const a = getSession("vault-1");
    const b = getSession("vault-2");
    a.tracker.commit([entry("e1", "body"), entry("e2", "other")]);
    b.tracker.commit([entry("e1", "body")]);

    evictEntity("e1");

    // e1 is now treated as new again; e2 stays known.
    expect(
      a.tracker.partition([entry("e1", "body")]).newOrChanged,
    ).toHaveLength(1);
    expect(a.tracker.partition([entry("e2", "other")]).unchanged).toHaveLength(
      1,
    );
    expect(
      b.tracker.partition([entry("e1", "body")]).newOrChanged,
    ).toHaveLength(1);
  });

  it("is a no-op for unknown ids", () => {
    const s = getSession("v");
    s.tracker.commit([entry("e1", "body")]);
    evictEntity("nope");
    expect(s.tracker.partition([entry("e1", "body")]).unchanged).toHaveLength(
      1,
    );
  });
});
