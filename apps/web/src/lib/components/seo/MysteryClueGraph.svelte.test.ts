/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
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

  it("zooms in and out with the buttons and resets to the whole graph", async () => {
    const { container } = render(MysteryClueGraph, { graph });
    const svg = () => container.querySelector("svg")!;
    const whole = svg().getAttribute("viewBox");

    expect(
      (screen.getByLabelText("Zoom out") as HTMLButtonElement).disabled,
    ).toBe(true);
    await fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(svg().getAttribute("viewBox")).not.toBe(whole);

    await fireEvent.click(screen.getByLabelText("Show the whole graph"));
    expect(svg().getAttribute("viewBox")).toBe(whole);
  });

  it("pans when dragged while zoomed, without selecting the node under the pointer", async () => {
    const { container } = render(MysteryClueGraph, { graph });
    await fireEvent.click(screen.getByLabelText("Zoom in"));
    const canvas = screen.getByTestId("mystery-clue-graph-canvas");
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 600, height: 300 }) as DOMRect;
    const before = container.querySelector("svg")!.getAttribute("viewBox");

    await fireEvent.pointerDown(canvas, { clientX: 300, clientY: 150 });
    await fireEvent.pointerMove(canvas, { clientX: 340, clientY: 170 });
    await fireEvent.pointerUp(canvas);
    const node = container.querySelector('[data-node-id="clue-1"]')!;
    await fireEvent.click(node);

    expect(container.querySelector("svg")!.getAttribute("viewBox")).not.toBe(
      before,
    );
    expect(node.getAttribute("aria-pressed")).toBe("false");
  });

  it("does not suppress a deliberate node click after a cancelled pan", async () => {
    const { container } = render(MysteryClueGraph, { graph });
    await fireEvent.click(screen.getByLabelText("Zoom in"));
    const canvas = screen.getByTestId("mystery-clue-graph-canvas");
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 600, height: 300 }) as DOMRect;

    await fireEvent.pointerDown(canvas, { clientX: 300, clientY: 150 });
    await fireEvent.pointerMove(canvas, { clientX: 340, clientY: 170 });
    await fireEvent.pointerCancel(canvas);

    const node = container.querySelector('[data-node-id="clue-1"]')!;
    await fireEvent.click(node);
    expect(node.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens an enlarged view and closes it with Escape", async () => {
    render(MysteryClueGraph, { graph });

    const opener = screen.getByLabelText("Enlarge the graph");
    opener.focus();
    await fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Clue graph, enlarged" });
    expect(dialog.querySelector("svg")).toBeTruthy();

    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    focusable.at(-1)!.focus();
    await fireEvent.keyDown(focusable.at(-1)!, { key: "Tab" });
    expect(document.activeElement).toBe(focusable[0]);
    await fireEvent.keyDown(focusable[0], { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(focusable.at(-1));

    await fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("renders nothing for an empty graph", () => {
    const { container } = render(MysteryClueGraph, {
      graph: { nodes: [], edges: [] },
    });

    expect(container.querySelector("svg")).toBeNull();
  });
});
