/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPointCrawlDiagramLayout,
  generatePointCrawlNetworkLocal,
} from "generator-engine";

const { svgToPngBlob } = vi.hoisted(() => ({
  svgToPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
}));

vi.mock("$lib/utils/svg-export", () => ({ svgToPngBlob }));

import PointCrawlGraph from "./PointCrawlGraph.svelte";

const crawl = generatePointCrawlNetworkLocal({ pointCount: 6 });

describe("PointCrawlGraph", () => {
  beforeEach(() => {
    svgToPngBlob.mockReset();
    svgToPngBlob.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows structural labels, selects nodes and routes, and preserves save toggles", async () => {
    render(PointCrawlGraph, { props: { crawl } });
    const start = crawl.nodes.find((node) => node.id === crawl.startNodeId)!;
    const startElement = screen.getByTestId(`point-crawl-node-${start.id}`);
    expect(startElement.textContent).toContain("START");
    await fireEvent.click(startElement);
    expect(
      screen.getByLabelText(`Location details: ${start.name}`),
    ).toBeTruthy();

    await fireEvent.click(
      screen.getByTestId(`point-crawl-toggle-save-${start.id}`),
    );
    expect(
      (
        screen.getByTestId(
          `point-crawl-toggle-save-${start.id}`,
        ) as HTMLInputElement
      ).checked,
    ).toBe(false);

    const route = crawl.routes[0];
    await fireEvent.click(screen.getByTestId(`point-crawl-edge-${route.id}`));
    expect(screen.getByLabelText("Route details")).toBeTruthy();
  });

  it("drags nodes and exports the current diagram as a PNG", async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const createUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:point-crawl");
    const revokeUrlSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    render(PointCrawlGraph, { props: { crawl } });

    const svg = screen.getByRole("img", {
      name: `Interactive point crawl network graph for ${crawl.title}`,
    });
    const layout = buildPointCrawlDiagramLayout(crawl);
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: layout.width,
      bottom: layout.height,
      width: layout.width,
      height: layout.height,
      toJSON: () => ({}),
    });
    const node = screen.getByTestId(`point-crawl-node-${crawl.nodes[1].id}`);
    const before = node.getAttribute("transform");
    await fireEvent.pointerDown(node, {
      button: 0,
      pointerId: 1,
      clientX: 80,
      clientY: 80,
    });
    await fireEvent.pointerMove(svg, {
      pointerId: 1,
      clientX: 140,
      clientY: 120,
    });
    await fireEvent.pointerUp(svg, { pointerId: 1 });
    expect(node.getAttribute("transform")).not.toBe(before);

    await fireEvent.click(
      screen.getByRole("button", { name: "Copy diagram as image" }),
    );
    await waitFor(() => expect(svgToPngBlob).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Copy diagram as image" })
          .getAttribute("title"),
      ).toBe("Downloaded"),
    );
    expect(clickSpy).toHaveBeenCalled();
    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it("does not move a node for click-sized pointer jitter", async () => {
    render(PointCrawlGraph, { props: { crawl } });
    const svg = screen.getByRole("img", {
      name: `Interactive point crawl network graph for ${crawl.title}`,
    });
    const layout = buildPointCrawlDiagramLayout(crawl);
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: layout.width,
      bottom: layout.height,
      width: layout.width,
      height: layout.height,
      toJSON: () => ({}),
    });
    const node = screen.getByTestId(`point-crawl-node-${crawl.nodes[1].id}`);
    const before = node.getAttribute("transform");
    await fireEvent.pointerDown(node, {
      button: 0,
      pointerId: 1,
      clientX: 80,
      clientY: 80,
    });
    await fireEvent.pointerMove(svg, {
      pointerId: 1,
      clientX: 82,
      clientY: 81,
    });
    await fireEvent.pointerUp(svg, { pointerId: 1 });
    expect(node.getAttribute("transform")).toBe(before);
  });

  it("preserves the grab offset across multiple drag moves", async () => {
    render(PointCrawlGraph, { props: { crawl } });
    const svg = screen.getByRole("img", {
      name: `Interactive point crawl network graph for ${crawl.title}`,
    });
    const layout = buildPointCrawlDiagramLayout(crawl);
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: layout.width,
      bottom: layout.height,
      width: layout.width,
      height: layout.height,
      toJSON: () => ({}),
    });

    const layoutNode = layout.nodes.find(
      (item) => item.id === crawl.nodes[1].id,
    )!;
    const node = screen.getByTestId(`point-crawl-node-${layoutNode.id}`);
    const pointerDown = { x: layoutNode.x + 12, y: layoutNode.y + 8 };
    const readPosition = () => {
      const match = node
        .getAttribute("transform")
        ?.match(/translate\(([^,]+),\s*([^)]+)\)/);
      expect(match).not.toBeNull();
      return { x: Number(match![1]), y: Number(match![2]) };
    };

    await fireEvent.pointerDown(node, {
      button: 0,
      pointerId: 1,
      clientX: pointerDown.x,
      clientY: pointerDown.y,
    });
    for (const pointer of [
      { x: pointerDown.x + 8, y: pointerDown.y + 6 },
      { x: pointerDown.x + 19, y: pointerDown.y + 21 },
    ]) {
      await fireEvent.pointerMove(svg, {
        pointerId: 1,
        clientX: pointer.x,
        clientY: pointer.y,
      });
      const nodePosition = readPosition();
      expect(nodePosition.x - pointer.x).toBe(layoutNode.x - pointerDown.x);
      expect(nodePosition.y - pointer.y).toBe(layoutNode.y - pointerDown.y);
    }
    await fireEvent.pointerUp(svg, { pointerId: 1 });
  });

  it("enters the fullscreen dialog, closes on Escape, and restores focus", async () => {
    render(PointCrawlGraph, { props: { crawl } });
    const trigger = screen.getByRole("button", {
      name: "Fit diagram to screen",
    });
    trigger.focus();
    await fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "Point crawl graph, fit to screen",
    });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    await fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(dialog.isConnected).toBe(false);
  });

  it("expires copy feedback after 2200 ms and restarts the timer on a new copy", async () => {
    vi.useFakeTimers();
    render(PointCrawlGraph, { props: { crawl } });
    await vi.advanceTimersToNextFrame();
    const copyButton = screen.getByRole("button", {
      name: "Copy diagram as image",
    });
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    await fireEvent.click(copyButton);
    await waitFor(() =>
      expect(copyButton.getAttribute("title")).toBe("Downloaded"),
    );
    const firstFeedbackTimerIndex = timeoutSpy.mock.calls.findIndex(
      ([, delay]) => delay === 2200,
    );
    expect(firstFeedbackTimerIndex).toBeGreaterThanOrEqual(0);
    const firstFeedbackTimer =
      timeoutSpy.mock.results[firstFeedbackTimerIndex]!.value;
    await vi.advanceTimersByTimeAsync(1500);

    await fireEvent.click(copyButton);
    await waitFor(() =>
      expect(copyButton.getAttribute("title")).toBe("Downloaded"),
    );
    expect(clearTimeoutSpy).toHaveBeenCalledWith(firstFeedbackTimer);
    await vi.advanceTimersByTimeAsync(700);
    expect(copyButton.getAttribute("title")).toBe("Downloaded");
    await vi.advanceTimersByTimeAsync(1500);
    expect(copyButton.getAttribute("title")).toBe("Copy network graph as PNG");
  });

  it("clears copy feedback timers on unmount and ignores a pending export", async () => {
    vi.useFakeTimers();
    const rendered = render(PointCrawlGraph, { props: { crawl } });
    await vi.advanceTimersToNextFrame();
    const copyButton = screen.getByRole("button", {
      name: "Copy diagram as image",
    });
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    await fireEvent.click(copyButton);
    await waitFor(() =>
      expect(copyButton.getAttribute("title")).toBe("Downloaded"),
    );
    const feedbackTimerIndex = timeoutSpy.mock.calls.findIndex(
      ([, delay]) => delay === 2200,
    );
    expect(feedbackTimerIndex).toBeGreaterThanOrEqual(0);
    const feedbackTimer = timeoutSpy.mock.results[feedbackTimerIndex]!.value;
    rendered.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(feedbackTimer);

    let finishExport!: (blob: Blob) => void;
    svgToPngBlob.mockImplementation(
      () => new Promise((resolve) => (finishExport = resolve)),
    );
    const pending = render(PointCrawlGraph, { props: { crawl } });
    await vi.advanceTimersToNextFrame();
    timeoutSpy.mockClear();
    await fireEvent.click(
      screen.getByRole("button", { name: "Copy diagram as image" }),
    );
    await waitFor(() => expect(svgToPngBlob).toHaveBeenCalled());
    pending.unmount();
    finishExport(new Blob(["png"], { type: "image/png" }));
    await Promise.resolve();
    await Promise.resolve();
    expect(timeoutSpy.mock.calls.some(([, delay]) => delay === 2200)).toBe(
      false,
    );
  });
});
