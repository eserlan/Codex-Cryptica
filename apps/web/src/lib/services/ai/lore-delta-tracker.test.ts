import { describe, it, expect } from "vitest";
import {
  LoreDeltaTracker,
  loreHash,
  type LoreEntry,
} from "./lore-delta-tracker";

const entry = (id: string, body: string): LoreEntry => ({
  id,
  snippet: `--- File: ${id} ---\n${body}`,
  hash: loreHash(body),
});

describe("loreHash", () => {
  it("is stable for identical input and differs on change", () => {
    expect(loreHash("hello")).toBe(loreHash("hello"));
    expect(loreHash("hello")).not.toBe(loreHash("hello!"));
  });
});

describe("LoreDeltaTracker", () => {
  it("treats everything as new on a fresh conversation", () => {
    const t = new LoreDeltaTracker();
    expect(t.isEmpty).toBe(true);
    const entries = [entry("a", "Aldric"), entry("b", "Ravenhold")];
    const { newOrChanged, unchanged } = t.partition(entries);
    expect(newOrChanged).toHaveLength(2);
    expect(unchanged).toHaveLength(0);
  });

  it("strips unchanged records after commit", () => {
    const t = new LoreDeltaTracker();
    const entries = [entry("a", "Aldric"), entry("b", "Ravenhold")];
    t.commit(entries);
    expect(t.isEmpty).toBe(false);

    const { newOrChanged, unchanged } = t.partition(entries);
    expect(newOrChanged).toHaveLength(0);
    expect(unchanged.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("detects a changed body as new/changed", () => {
    const t = new LoreDeltaTracker();
    t.commit([entry("a", "Aldric")]);

    const { newOrChanged } = t.partition([entry("a", "Aldric the Bold")]);
    expect(newOrChanged.map((e) => e.id)).toEqual(["a"]);
  });

  it("includes genuinely new records while keeping known ones stripped", () => {
    const t = new LoreDeltaTracker();
    t.commit([entry("a", "Aldric")]);

    const { newOrChanged, unchanged } = t.partition([
      entry("a", "Aldric"),
      entry("c", "New Place"),
    ]);
    expect(newOrChanged.map((e) => e.id)).toEqual(["c"]);
    expect(unchanged.map((e) => e.id)).toEqual(["a"]);
  });

  it("does not mutate state on partition (only commit does)", () => {
    const t = new LoreDeltaTracker();
    const entries = [entry("a", "Aldric")];
    t.partition(entries);
    expect(t.isEmpty).toBe(true);
  });

  it("forgets everything on reset", () => {
    const t = new LoreDeltaTracker();
    t.commit([entry("a", "Aldric")]);
    t.reset();
    expect(t.isEmpty).toBe(true);
    const { newOrChanged } = t.partition([entry("a", "Aldric")]);
    expect(newOrChanged).toHaveLength(1);
  });

  it("caches the style block under its synthetic id", () => {
    const t = new LoreDeltaTracker();
    const style = entry("__style__", "GLOBAL ART STYLE: noir");
    t.commit([style]);
    const { unchanged } = t.partition([style]);
    expect(unchanged.map((e) => e.id)).toEqual(["__style__"]);
  });
});
