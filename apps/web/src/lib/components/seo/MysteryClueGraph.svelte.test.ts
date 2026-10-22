/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { MysteryGraph } from "generator-engine";
import MysteryClueGraph from "./MysteryClueGraph.svelte";

const graph: MysteryGraph = {
  nodes: [
    { id: "person-1", kind: "person", label: "Mara Quill", mark: "culprit" },
    { id: "place-1", kind: "place", label: "Vault", mark: "key-item" },
    { id: "clue-1", kind: "clue", label: "Lead 1: Wax on the door" },
    { id: "rev-1", kind: "revelation", label: "Mara copied the key" },
  ],
  edges: [
    { from: "place-1", to: "clue-1", kind: "found" },
    { from: "clue-1", to: "person-1", kind: "leads" },
    { from: "clue-1", to: "rev-1", kind: "supports" },
  ],
};

describe("MysteryClueGraph", () => {
  it("draws every node and edge and marks the culprit and key item", () => {
    const { container } = render(MysteryClueGraph, { graph });

    expect(screen.getByText("Clue Graph — GM Only")).toBeTruthy();
    expect(container.querySelectorAll("[data-node-id]")).toHaveLength(4);
    expect(container.querySelectorAll("svg path")).toHaveLength(3);
    expect(screen.getByText("Mara copied the key")).toBeTruthy();
    const titles = [...container.querySelectorAll("g > title")].map((t) =>
      t.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(titles).toEqual([
      "The culprit: Mara Quill",
      "Where the key item is now: Vault",
    ]);
  });

  it("highlights what a selected node connects to and fades the rest", async () => {
    const { container } = render(MysteryClueGraph, { graph });
    const node = (id: string) =>
      container.querySelector<SVGGElement>(`[data-node-id="${id}"]`)!;

    await fireEvent.click(node("rev-1"));

    expect(node("rev-1").getAttribute("aria-pressed")).toBe("true");
    expect(node("clue-1").getAttribute("opacity")).toBe("1");
    expect(node("person-1").getAttribute("opacity")).toBe("0.3");
    const faded = [...container.querySelectorAll("svg path")].filter(
      (p) => p.getAttribute("opacity") === "0.07",
    );
    expect(faded).toHaveLength(2);

    await fireEvent.click(node("rev-1"));
    expect(node("person-1").getAttribute("opacity")).toBe("1");
  });

  it("selects with the keyboard", async () => {
    const { container } = render(MysteryClueGraph, { graph });
    const place = container.querySelector<SVGGElement>(
      '[data-node-id="place-1"]',
    )!;

    await fireEvent.keyDown(place, { key: "Enter" });

    expect(place.getAttribute("aria-pressed")).toBe("true");
  });

  it("renders nothing for an empty graph", () => {
    const { container } = render(MysteryClueGraph, {
      graph: { nodes: [], edges: [] },
    });

    expect(container.querySelector("svg")).toBeNull();
  });
});
