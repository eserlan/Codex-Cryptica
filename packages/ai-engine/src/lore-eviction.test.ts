import { describe, it, expect } from "vitest";
import { InteractionSessionManager } from "./interaction-session";
import { entityContentHash } from "@codex/oracle-engine";
import type { LoreEntry } from "@codex/oracle-engine";

const entry = (id: string, body: string): LoreEntry => ({
  id,
  snippet: `--- File: ${id} ---\n${body}`,
  hash: entityContentHash(body),
});

describe("lore eviction (Phase 5.1)", () => {
  it("evicts a record from every conversation so it is re-sent", () => {
    const mgr = new InteractionSessionManager();
    const a = mgr.getSession("vault-1");
    const b = mgr.getSession("vault-2");
    a.tracker.commit([entry("e1", "body"), entry("e2", "other")]);
    b.tracker.commit([entry("e1", "body")]);

    mgr.evictEntity("e1");

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
    const mgr = new InteractionSessionManager();
    const s = mgr.getSession("v");
    s.tracker.commit([entry("e1", "body")]);
    mgr.evictEntity("nope");
    expect(s.tracker.partition([entry("e1", "body")]).unchanged).toHaveLength(
      1,
    );
  });
});
