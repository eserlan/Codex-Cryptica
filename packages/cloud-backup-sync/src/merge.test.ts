import { describe, expect, it } from "vitest";
import { mergeEntities, type MergeEntity } from "./merge";

const ids = () => {
  let n = 0;
  return () => `copy-${++n}`;
};
const opts = () => ({ copyAuthorName: "Mara", newId: ids() });
const ent = (over: Record<string, unknown> = {}): MergeEntity => ({
  id: "a",
  title: "T",
  content: "x",
  labels: [],
  ...over,
});

describe("mergeEntities", () => {
  it("keeps an entity added on one side", () => {
    const a = ent();
    const r1 = mergeEntities({ base: {}, mine: { a }, theirs: {} }, opts());
    expect(r1.entities).toEqual({ a });
    expect(r1.copies).toEqual([]);
    expect(r1.deletes).toEqual([]);
    const b = ent({ id: "b" });
    const r2 = mergeEntities({ base: {}, mine: {}, theirs: { b } }, opts());
    expect(r2.entities).toEqual({ b });
  });

  it("keeps entities added on both sides with different ids", () => {
    const r = mergeEntities(
      { base: {}, mine: { a: ent() }, theirs: { b: ent({ id: "b" }) } },
      opts(),
    );
    expect(Object.keys(r.entities).sort()).toEqual(["a", "b"]);
    expect(r.copies).toEqual([]);
  });

  it("combines edits to different fields", () => {
    const base = ent();
    const r = mergeEntities(
      {
        base: { a: base },
        mine: { a: ent({ content: "m" }) },
        theirs: { a: ent({ labels: ["l"] }) },
      },
      opts(),
    );
    expect(r.entities.a).toMatchObject({ content: "m", labels: ["l"] });
    expect(r.summary.combined).toEqual(["a"]);
    expect(r.copies).toEqual([]);
  });

  it("ignores timestamps and takes the larger", () => {
    const r = mergeEntities(
      {
        base: { a: ent({ updatedAt: 1 }) },
        mine: { a: ent({ content: "m", updatedAt: 5 }) },
        theirs: { a: ent({ labels: ["l"], updatedAt: 9 }) },
      },
      opts(),
    );
    expect(r.entities.a.updatedAt).toBe(9);
    expect(r.copies).toEqual([]);
  });

  it("does not clash on the same value", () => {
    const r = mergeEntities(
      {
        base: { a: ent() },
        mine: { a: ent({ content: "s" }) },
        theirs: { a: ent({ content: "s" }) },
      },
      opts(),
    );
    expect(r.copies).toEqual([]);
    expect(r.entities.a.content).toBe("s");
  });

  const clashInput = () => ({
    base: { a: ent() },
    mine: { a: ent({ content: "m", _path: "p.md" }) },
    theirs: { a: ent({ content: "t" }) },
  });

  it("keeps theirs and copies mine on a same-field clash", () => {
    const r = mergeEntities(clashInput(), opts());
    expect(r.entities.a).toEqual(ent({ content: "t" }));
    expect(r.copies).toHaveLength(1);
    expect(r.copies[0]).toMatchObject({
      id: "copy-1",
      content: "m",
      title: "T (Mara's version)",
    });
    expect("_path" in r.copies[0]).toBe(false);
    expect(r.summary.copies).toEqual([
      { originalId: "a", copyId: "copy-1", title: "T (Mara's version)" },
    ]);
  });

  it("keeps an edit over a delete, either way", () => {
    const edited = ent({ content: "e" });
    const r1 = mergeEntities(
      { base: { a: ent() }, mine: {}, theirs: { a: edited } },
      opts(),
    );
    expect(r1.entities.a).toEqual(edited);
    expect(r1.summary.editsKeptOverDelete).toEqual(["a"]);
    const r2 = mergeEntities(
      { base: { a: ent() }, mine: { a: edited }, theirs: { a: null } },
      opts(),
    );
    expect(r2.entities.a).toEqual(edited);
  });

  it("deletes when the other side is unchanged", () => {
    const r = mergeEntities(
      { base: { a: ent() }, mine: {}, theirs: { a: ent() } },
      opts(),
    );
    expect(r.deletes).toEqual(["a"]);
    expect(r.entities.a).toBeUndefined();
  });

  it("deletes when deleted on both sides", () => {
    const r = mergeEntities(
      { base: { a: ent() }, mine: {}, theirs: { a: null } },
      opts(),
    );
    expect(r.deletes).toEqual(["a"]);
    expect(r.summary.deleted).toEqual(["a"]);
    expect(r.entities.a).toBeUndefined();
  });

  it("never overwrites without a base", () => {
    const r = mergeEntities(
      {
        base: {},
        mine: { a: ent({ content: "m" }) },
        theirs: { a: ent({ content: "t" }) },
      },
      opts(),
    );
    expect(r.entities.a.content).toBe("t");
    expect(r.copies).toHaveLength(1);
    const same = mergeEntities(
      {
        base: {},
        mine: { a: ent({ updatedAt: 1 }) },
        theirs: { a: ent({ updatedAt: 2 }) },
      },
      opts(),
    );
    expect(same.copies).toEqual([]);
  });

  it("merges a copy again by the same rules", () => {
    const copy = mergeEntities(clashInput(), opts()).copies[0];
    const combined = mergeEntities(
      {
        base: { [copy.id]: copy },
        mine: { [copy.id]: { ...copy, content: "m2" } },
        theirs: { [copy.id]: { ...copy, labels: ["l"] } },
      },
      opts(),
    );
    expect(combined.entities[copy.id]).toMatchObject({
      content: "m2",
      labels: ["l"],
    });
    const clash = mergeEntities(
      {
        base: { [copy.id]: copy },
        mine: { [copy.id]: { ...copy, content: "m2" } },
        theirs: { [copy.id]: { ...copy, content: "t2" } },
      },
      { copyAuthorName: "Mara", newId: () => "copy-2" },
    );
    expect(clash.copies[0].id).toBe("copy-2");
    expect(clash.copies[0].title).toBe("T (Mara's version)");
  });

  it("does not mutate frozen inputs", () => {
    const freeze = <T>(v: T): T => {
      if (v && typeof v === "object") {
        Object.values(v).forEach(freeze);
        Object.freeze(v);
      }
      return v;
    };
    const input = freeze(clashInput());
    expect(() => mergeEntities(input, opts())).not.toThrow();
  });
});
