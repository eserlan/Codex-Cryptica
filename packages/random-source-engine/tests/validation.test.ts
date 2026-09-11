import { describe, it, expect } from "vitest";
import { validateSource } from "../src/validation";
import type { RandomSource } from "../src/types";

const ranged = (
  entries: RandomSource["entries"],
  sides = 10,
): RandomSource => ({
  id: "t",
  name: "T",
  kind: "table",
  labels: [],
  selection: { mode: "ranged", die: { sides } },
  entries,
});

const weighted = (entries: RandomSource["entries"]): RandomSource => ({
  id: "t",
  name: "T",
  kind: "table",
  labels: [],
  selection: { mode: "weighted" },
  entries,
});

describe("validateSource", () => {
  it("reports a duplicate name as an error (FR-003a)", () => {
    const diags = validateSource(weighted([{ id: "a", text: "x" }]), ["T"]);
    const dupe = diags.find((d) => d.code === "duplicate-name");
    expect(dupe?.severity).toBe("error");
  });

  it("does not flag a name that is unique", () => {
    const diags = validateSource(weighted([{ id: "a", text: "x" }]), ["Other"]);
    expect(diags.find((d) => d.code === "duplicate-name")).toBeUndefined();
  });

  it("compares names case-insensitively", () => {
    const diags = validateSource(weighted([{ id: "a", text: "x" }]), ["t"]);
    expect(diags.find((d) => d.code === "duplicate-name")).toBeDefined();
  });

  it("reports a range gap as a warning, never an error (FR-006)", () => {
    const diags = validateSource(
      ranged([
        { id: "a", text: "x", range: { min: 1, max: 4 } },
        { id: "b", text: "y", range: { min: 6, max: 10 } },
      ]),
      [],
    );
    const gap = diags.find((d) => d.code === "range-gap");
    expect(gap).toBeDefined();
    expect(gap?.severity).toBe("warning");
  });

  it("reports a range overlap as a warning", () => {
    const diags = validateSource(
      ranged([
        { id: "a", text: "x", range: { min: 1, max: 6 } },
        { id: "b", text: "y", range: { min: 5, max: 10 } },
      ]),
      [],
    );
    const overlap = diags.find((d) => d.code === "range-overlap");
    expect(overlap?.severity).toBe("warning");
  });

  it("reports an entry that can never be rolled", () => {
    const diags = validateSource(
      ranged([{ id: "a", text: "x", range: { min: 20, max: 25 } }]),
      [],
    );
    expect(diags.find((d) => d.code === "unreachable-entry")).toBeDefined();
  });

  it("exempts weighted tables from coverage checks", () => {
    const diags = validateSource(
      weighted([
        { id: "a", text: "x", weight: 1 },
        { id: "b", text: "y", weight: 3 },
      ]),
      [],
    );
    expect(
      diags.filter((d) =>
        ["range-gap", "range-overlap", "unreachable-entry"].includes(d.code),
      ),
    ).toHaveLength(0);
  });

  it("reports an empty source as a warning rather than throwing", () => {
    const diags = validateSource(weighted([]), []);
    const empty = diags.find((d) => d.code === "empty-source");
    expect(empty?.severity).toBe("warning");
  });

  it("never returns an error for anything except a duplicate name", () => {
    const diags = validateSource(
      ranged([
        { id: "a", text: "{missing}", range: { min: 1, max: 4 } },
        { id: "b", text: "y", range: { min: 6, max: 30 } },
      ]),
      [],
    );
    const errors = diags.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("flags a broken reference when the target is unknown", () => {
    const diags = validateSource(
      weighted([{ id: "a", text: "A {creature} appears" }]),
      [],
      ["treasure"],
    );
    expect(diags.find((d) => d.code === "broken-reference")).toBeDefined();
  });

  it("does not flag a reference whose target exists", () => {
    const diags = validateSource(
      weighted([{ id: "a", text: "A {creature} appears" }]),
      [],
      ["creature"],
    );
    expect(diags.find((d) => d.code === "broken-reference")).toBeUndefined();
  });
});

describe("validateSource — malformed reference syntax", () => {
  const table = (text: string): RandomSource => ({
    id: "t1",
    name: "Rumours",
    kind: "table",
    labels: [],
    selection: { mode: "weighted" },
    entries: [{ id: "e1", text, weight: 1 }],
  });

  it("warns about an unclosed brace without blocking a save", () => {
    const found = validateSource(table("A {creature appears"), [], []);
    const malformed = found.filter((d) => d.code === "malformed-reference");
    expect(malformed).toHaveLength(1);
    expect(malformed[0].severity).toBe("warning");
    expect(malformed[0].entryId).toBe("e1");
  });

  it("warns about empty braces", () => {
    const found = validateSource(table("Nothing {} here"), [], []);
    expect(found.some((d) => d.code === "malformed-reference")).toBe(true);
  });

  it("says nothing about well-formed references", () => {
    const found = validateSource(table("A {creature} appears"), [], []);
    expect(found.some((d) => d.code === "malformed-reference")).toBe(false);
  });
});
