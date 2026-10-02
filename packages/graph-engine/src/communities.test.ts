import { describe, expect, it } from "vitest";
import { detectCommunities } from "./communities";

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

  it("leaves unconnected nodes in a community of their own, and ignores edges to unknown nodes (negative)", () => {
    const labels = detectCommunities(["x", "y"], [["x", "ghost"]]);
    expect(labels.get("x")).toBe("x");
    expect(labels.get("y")).toBe("y");
    expect(labels.has("ghost")).toBe(false);
  });
});
