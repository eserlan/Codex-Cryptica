import { describe, it, expect } from "vitest";
import { filterPinnedIds, buildLinkedSummaryLines } from "./pinned-context";

const entity = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: id.toUpperCase(),
  type: "character",
  labels: [],
  connections: [],
  content: `${id} body`,
  ...extra,
});

const vaultOf = (entities: any[], isGuest = false): any => ({
  entities: Object.fromEntries(entities.map((e) => [e.id, e])),
  isGuest,
  defaultVisibility: "visible",
  inboundConnections: {},
});

describe("filterPinnedIds", () => {
  it("keeps valid ids in order and removes duplicates", () => {
    const vault = vaultOf([entity("a"), entity("b")]);
    expect(filterPinnedIds(["b", "a", "b"], vault)).toEqual(["b", "a"]);
  });

  it("drops ids that are not in the active Vault", () => {
    const vault = vaultOf([entity("a")]);
    expect(filterPinnedIds(["a", "other-vault-id"], vault)).toEqual(["a"]);
  });

  it("drops hidden entities in guest mode even when the id is supplied", () => {
    const vault = vaultOf(
      [entity("a"), entity("secret", { labels: ["hidden"] })],
      true,
    );
    expect(filterPinnedIds(["secret", "a"], vault)).toEqual(["a"]);
  });

  it("returns an empty list when nothing is pinned", () => {
    expect(filterPinnedIds(undefined, vaultOf([]))).toEqual([]);
    expect(filterPinnedIds([], vaultOf([]))).toEqual([]);
  });
});

describe("buildLinkedSummaryLines", () => {
  it("summarises only direct connections of pinned entities", () => {
    const a = entity("a", { connections: [{ target: "b", type: "knows" }] });
    const b = entity("b", { connections: [{ target: "c", type: "knows" }] });
    const c = entity("c");
    const vault = vaultOf([a, b, c]);
    const lines = buildLinkedSummaryLines(["a"], vault, 10_000);
    expect(lines.join("\n")).toContain("B");
    expect(lines.join("\n")).not.toContain("C");
  });

  it("skips targets that are already pinned", () => {
    const a = entity("a", { connections: [{ target: "b", type: "knows" }] });
    const vault = vaultOf([a, entity("b")]);
    expect(buildLinkedSummaryLines(["a", "b"], vault, 10_000)).toEqual([]);
  });

  it("skips hidden targets in guest mode", () => {
    const a = entity("a", { connections: [{ target: "s", type: "knows" }] });
    const vault = vaultOf([a, entity("s", { labels: ["hidden"] })], true);
    expect(buildLinkedSummaryLines(["a"], vault, 10_000)).toEqual([]);
  });

  it("stops adding lines once the budget is used up", () => {
    const a = entity("a", {
      connections: [
        { target: "b", type: "knows" },
        { target: "c", type: "knows" },
      ],
    });
    const vault = vaultOf([a, entity("b"), entity("c")]);
    const lines = buildLinkedSummaryLines(["a"], vault, 10);
    expect(lines.length).toBeLessThanOrEqual(1);
  });
});
