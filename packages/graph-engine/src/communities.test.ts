import { describe, expect, it } from "vitest";
import { detectCommunities, linkedPieces } from "./communities";

const clique = (ids: string[]) => {
  const out: Array<[string, string]> = [];
  for (let a = 0; a < ids.length; a++)
    for (let b = a + 1; b < ids.length; b++) out.push([ids[a], ids[b]]);
  return out;
};

describe("detectCommunities", () => {
  const A = ["a1", "a2", "a3", "a4", "a5"];
  const B = ["b1", "b2", "b3", "b4", "b5"];
  const edges = [...clique(A), ...clique(B), ["a5", "b1"] as [string, string]];

  it("puts densely linked groups in separate communities", () => {
    const labels = detectCommunities([...A, ...B], edges);
    const ofA = new Set(A.map((id) => labels.get(id)));
    const ofB = new Set(B.map((id) => labels.get(id)));
    expect(ofA.size).toBe(1);
    expect(ofB.size).toBe(1);
    expect([...ofA][0]).not.toBe([...ofB][0]);
  });

  it("gives the same answer whatever order the graph arrives in", () => {
    const forward = detectCommunities([...A, ...B], edges);
    const reversed = detectCommunities(
      [...B, ...A].reverse(),
      [...edges].reverse(),
    );
    expect([...reversed.entries()].sort()).toEqual(
      [...forward.entries()].sort(),
    );
  });

  it("splits ids into linked pieces, only across links it is allowed to follow", () => {
    const near: Record<string, string[]> = {
      a: ["b"],
      b: ["a", "c"],
      c: ["b"],
      d: [],
    };
    expect(linkedPieces(["a", "b", "c", "d"], (id) => near[id])).toEqual([
      ["a", "b", "c"],
      ["d"],
    ]);
    expect(
      linkedPieces(
        ["a", "b", "c", "d"],
        (id) => near[id],
        (x, y) => x + y !== "bc",
      ),
    ).toEqual([["a", "b"], ["c"], ["d"]]);
  });

  it("leaves unconnected nodes in a community of their own, and ignores edges to unknown nodes (negative)", () => {
    const labels = detectCommunities(["x", "y"], [["x", "ghost"]]);
    expect(labels.get("x")).toBe("x");
    expect(labels.get("y")).toBe("y");
    expect(labels.has("ghost")).toBe(false);
  });

  it("never puts unlinked pieces in one community", () => {
    // A sparse, irregular graph where propagation could otherwise leave one
    // label on pieces that are not linked.
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const ids = Array.from({ length: 300 }, (_, i) => `n${i}`);
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < 420; i++)
      pairs.push([
        ids[Math.floor(rand() * 300)],
        ids[Math.floor(rand() * 300)],
      ]);
    const labels = detectCommunities(ids, pairs);

    const byLabel = new Map<string, Set<string>>();
    for (const [id, l] of labels) {
      if (!byLabel.has(l)) byLabel.set(l, new Set());
      byLabel.get(l)!.add(id);
    }
    const near = new Map<string, string[]>(ids.map((id) => [id, []]));
    for (const [a, b] of pairs) {
      near.get(a)!.push(b);
      near.get(b)!.push(a);
    }
    for (const members of byLabel.values()) {
      const pieces = linkedPieces([...members].sort(), (id) => near.get(id)!);
      expect(pieces).toHaveLength(1);
    }
  });
});
