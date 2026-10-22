/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/svelte";
import BiomeStatement from "./BiomeStatement.svelte";

const numbers = { a: 1, b: 2 };

describe("BiomeStatement", () => {
  it.each([
    ["pattern", "Common pattern"],
    ["simplification", "Simplification"],
    ["exception", "Exception"],
  ] as const)("labels a %s statement in text", (basis, label) => {
    render(BiomeStatement, {
      props: {
        statement: { text: "Some fact.", basis, sourceIds: [] },
        sourceNumbers: numbers,
        anchorPrefix: "x",
      },
    });
    expect(screen.getByText("Some fact.")).toBeTruthy();
    expect(screen.getByText(label)).toBeTruthy();
  });

  it("links each cited source to the sources list", () => {
    render(BiomeStatement, {
      props: {
        statement: { text: "Cited.", basis: "pattern", sourceIds: ["a", "b"] },
        sourceNumbers: numbers,
        anchorPrefix: "tundra",
      },
    });
    const first = screen.getByRole("link", { name: "Source 1" });
    expect(first.getAttribute("href")).toBe("#tundra-source-a");
    expect(
      screen.getByRole("link", { name: "Source 2" }).getAttribute("href"),
    ).toBe("#tundra-source-b");
  });

  it("ignores a source id it has no number for rather than breaking", () => {
    render(BiomeStatement, {
      props: {
        statement: { text: "Odd.", basis: "pattern", sourceIds: ["zzz"] },
        sourceNumbers: numbers,
        anchorPrefix: "x",
      },
    });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
