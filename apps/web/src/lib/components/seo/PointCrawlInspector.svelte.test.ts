/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { generatePointCrawlNetworkLocal } from "generator-engine";
import PointCrawlInspector from "./PointCrawlInspector.svelte";

const crawl = generatePointCrawlNetworkLocal({
  pointCount: 6,
  scale: "Wilderness",
});

describe("PointCrawlInspector", () => {
  it("shows structural details and toggles location inclusion", async () => {
    const node = crawl.nodes[0];
    const onToggleSave = vi.fn();
    render(PointCrawlInspector, {
      props: { node, nodes: crawl.nodes, included: true, onToggleSave },
    });

    expect(screen.getByText(node.name)).toBeTruthy();
    expect(
      screen.getByLabelText(`Location details: ${node.name}`).textContent,
    ).toContain("◎");
    expect(
      (
        screen.getByTestId(
          `point-crawl-toggle-save-${node.id}`,
        ) as HTMLInputElement
      ).checked,
    ).toBe(true);
    await fireEvent.click(
      screen.getByTestId(`point-crawl-toggle-save-${node.id}`),
    );
    expect(onToggleSave).toHaveBeenCalledWith(node.id);
  });

  it("shows both approaches on a bidirectional route and preserves regeneration target", async () => {
    const route = crawl.routes.find(
      (entry) => entry.direction === "bidirectional",
    )!;
    const onRegeneratePart = vi.fn();
    render(PointCrawlInspector, {
      props: { route, nodes: crawl.nodes, onRegeneratePart },
    });

    expect(screen.getByLabelText("Route details").textContent).toContain("⇄");
    expect(
      screen.getByText(
        `← Approach from ${crawl.nodes.find((node) => node.id === route.toNodeId)!.name}:`,
      ),
    ).toBeTruthy();
    await fireEvent.click(
      screen.getByTestId("point-crawl-inspector-regenerate"),
    );
    expect(onRegeneratePart).toHaveBeenCalledWith(
      { kind: "route", id: route.id },
      undefined,
    );
  });

  it("accepts steering and disables actions while regeneration is busy", async () => {
    const node = crawl.nodes[1];
    const onRegeneratePart = vi.fn();
    const { rerender } = render(PointCrawlInspector, {
      props: {
        node,
        nodes: crawl.nodes,
        canUseAI: true,
        busyId: crawl.nodes[2].id,
        onRegeneratePart,
      },
    });
    expect(
      (
        screen.getByTestId(
          "point-crawl-inspector-regenerate",
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await rerender({
      node,
      nodes: crawl.nodes,
      canUseAI: true,
      busyId: null,
      onRegeneratePart,
    });
    await fireEvent.click(screen.getByTestId("point-crawl-inspector-revise"));
    await fireEvent.input(screen.getByLabelText("Steer location rewrite"), {
      target: { value: "make it flooded" },
    });
    await fireEvent.click(screen.getByText("Apply"));
    expect(onRegeneratePart).toHaveBeenCalledWith(
      { kind: "node", id: node.id },
      "make it flooded",
    );
  });

  it("clears steering when the inspected target changes", async () => {
    const first = crawl.nodes[1];
    const next = crawl.nodes[2];
    const { rerender } = render(PointCrawlInspector, {
      props: {
        node: first,
        nodes: crawl.nodes,
        canUseAI: true,
        onRegeneratePart: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByTestId("point-crawl-inspector-revise"));
    await fireEvent.input(screen.getByLabelText("Steer location rewrite"), {
      target: { value: "make it flooded" },
    });
    await rerender({ node: next, nodes: crawl.nodes, canUseAI: true });

    expect(screen.queryByLabelText("Steer location rewrite")).toBeNull();
  });
});
