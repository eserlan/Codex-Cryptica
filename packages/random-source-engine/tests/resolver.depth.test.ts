import { describe, it, expect } from "vitest";
import { DiceEngine } from "dice-engine";
import { RandomSourceEngine } from "../src/engine";
import { seededCrypto } from "./helpers/seeded-crypto";
import { MAX_RESOLUTION_DEPTH } from "../src/types";
import type { RandomSource, ResolutionContext } from "../src/types";

/** Builds a straight chain t0 → t1 → … → tN, each naming the next. */
function chain(length: number): RandomSource[] {
  const sources: RandomSource[] = [];
  for (let i = 0; i < length; i++) {
    const next = i === length - 1 ? "end" : `t${i + 1}`;
    sources.push({
      id: `t${i}`,
      name: `t${i}`,
      kind: "table",
      labels: [],
      selection: { mode: "weighted" },
      entries: [{ id: `e${i}`, text: `{${next}}` }],
    });
  }
  sources.push({
    id: "end",
    name: "end",
    kind: "table",
    labels: [],
    selection: { mode: "weighted" },
    entries: [{ id: "leaf", text: "bottom" }],
  });
  return sources;
}

function ctxOf(sources: RandomSource[]): ResolutionContext {
  const byName = new Map(sources.map((s) => [s.name.toLowerCase(), s]));
  return { lookup: (n) => byName.get(n.trim().toLowerCase()) };
}

const engine = () => new RandomSourceEngine(new DiceEngine(seededCrypto(5)));

describe("depth limiting (FR-015)", () => {
  it("resolves a chain that stays within the limit", () => {
    const sources = chain(3);
    const out = engine().roll(sources[0], ctxOf(sources));
    expect(out.finalText).toBe("bottom");
    expect(out.notices).toHaveLength(0);
  });

  it("stops at the limit and reports it", () => {
    const sources = chain(MAX_RESOLUTION_DEPTH + 4);
    const out = engine().roll(sources[0], ctxOf(sources));
    expect(out.notices.some((n) => n.kind === "depth-limit")).toBe(true);
  });

  it("uses a different message from the cycle case", () => {
    const sources = chain(MAX_RESOLUTION_DEPTH + 4);
    const out = engine().roll(sources[0], ctxOf(sources));
    const notice = out.notices.find((n) => n.kind === "depth-limit");
    expect(notice?.message.toLowerCase()).toContain("nesting");
    expect(notice?.message.toLowerCase()).not.toContain("loop");
  });

  it("marks the cut-off node as depth-limit, not cycle", () => {
    const sources = chain(MAX_RESOLUTION_DEPTH + 4);
    const out = engine().roll(sources[0], ctxOf(sources));
    let node = out.chain[0];
    while (node.children.length > 0) node = node.children[0];
    expect(node.status).toBe("depth-limit");
  });

  it("honours a custom depth limit passed to the constructor", () => {
    const sources = chain(4);
    const shallow = new RandomSourceEngine(new DiceEngine(seededCrypto(5)), 2);
    const out = shallow.roll(sources[0], ctxOf(sources));
    expect(out.notices.some((n) => n.kind === "depth-limit")).toBe(true);
  });

  it("still returns usable text when the limit is hit", () => {
    const sources = chain(MAX_RESOLUTION_DEPTH + 4);
    const out = engine().roll(sources[0], ctxOf(sources));
    expect(typeof out.finalText).toBe("string");
    expect(out.finalText.length).toBeGreaterThan(0);
  });
});
