/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    svgToPngBlob.mockClear();
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
});
