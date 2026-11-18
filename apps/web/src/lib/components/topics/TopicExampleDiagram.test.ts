/** @vitest-environment jsdom */

import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import TopicExampleDiagram from "./TopicExampleDiagram.svelte";
import { STAR_SYSTEMS_TOPIC_CONFIG } from "#lib/content/topics/star-systems.js";

const diagram = STAR_SYSTEMS_TOPIC_CONFIG.inlineExample.diagram;
const name = (id: string) => diagram.nodes.find((n) => n.id === id)!.name;

describe("TopicExampleDiagram", () => {
  it("renders a labelled figure and SVG", () => {
    const { container } = render(TopicExampleDiagram, { props: { diagram } });

    expect(
      container.querySelector('figure[data-testid="topic-example-diagram"]'),
    ).not.toBeNull();
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("role")).toBe("img");
    const byAttr = (attr: string) => {
      const id = svg.getAttribute(attr)!;
      expect(id.split(" ")).toHaveLength(1);
      return container.querySelector(`#${CSS.escape(id)}`);
    };
    expect(byAttr("aria-labelledby")?.textContent).toBe(diagram.title);
    expect(byAttr("aria-describedby")?.textContent).toBe(diagram.description);
  });

  it("lists one item per link and marks the flashpoint in text", () => {
    const { container } = render(TopicExampleDiagram, { props: { diagram } });

    const items = Array.from(container.querySelectorAll("ol > li"));
    expect(items).toHaveLength(diagram.links.length);
    items.forEach((li, i) => {
      expect(li.textContent).toContain(name(diagram.links[i].from));
      expect(li.textContent).toContain(name(diagram.links[i].to));
    });
    const flagged = items.filter((li) => /flashpoint/i.test(li.textContent!));
    expect(flagged).toHaveLength(1);
    expect(container.textContent).toContain("Missing convoy");
  });

  it("shows each node's role as text", () => {
    const { container } = render(TopicExampleDiagram, { props: { diagram } });

    for (const node of diagram.nodes) {
      expect(container.textContent).toContain(node.role);
    }
  });

  it("keeps every route in the three-node cycle visible around its middle node", () => {
    const { container } = render(TopicExampleDiagram, { props: { diagram } });
    const svg = container.querySelector("svg")!;
    const middle = svg.querySelectorAll("rect")[1];
    const outerRoute = Array.from(svg.querySelectorAll("line")).find(
      (line) =>
        line.getAttribute("x1") === "400" && line.getAttribute("x2") === "80",
    )!;
    const routeY = Number(outerRoute.getAttribute("y1"));
    const middleTop = Number(middle.getAttribute("y"));
    const middleBottom = middleTop + Number(middle.getAttribute("height"));

    expect(routeY < middleTop || routeY > middleBottom).toBe(true);
  });

  it("does not clip horizontally or use dl, ul or h3", () => {
    const { container } = render(TopicExampleDiagram, { props: { diagram } });

    expect(container.querySelector('[class*="min-w-"]')).toBeNull();
    expect(container.querySelector('[class*="overflow-x-auto"]')).toBeNull();
    expect(container.querySelector("dl, dt, ul, h3")).toBeNull();
  });

  it("shows no flashpoint text when no link is flagged", () => {
    const calm = {
      ...diagram,
      description: "Three places joined by routes.",
      links: diagram.links.map(({ flashpoint: _f, ...l }) => l),
    };
    const { container } = render(TopicExampleDiagram, {
      props: { diagram: calm },
    });
    expect(container.textContent).not.toMatch(/flashpoint|Missing convoy/i);
  });

  it("places sparse diagrams without dropping their nodes", () => {
    const sparse = {
      ...diagram,
      nodes: diagram.nodes.slice(0, 2),
      links: [],
    };
    const { container } = render(TopicExampleDiagram, {
      props: { diagram: sparse },
    });

    expect(container.querySelectorAll("svg rect")).toHaveLength(2);
    for (const node of sparse.nodes) {
      expect(container.querySelector("svg")?.textContent).toContain(node.name);
    }
  });

  it("connects cross-row flows to node boundaries and fits four nodes", () => {
    const expanded = {
      ...diagram,
      nodes: [
        ...diagram.nodes,
        { id: "relay", name: "Relay", role: "Transit" },
      ],
      links: [
        {
          from: "tern",
          to: "relay",
          kind: "flow" as const,
          label: "Supplies",
          detail: "Supplies travel through the relay.",
        },
      ],
    };
    const { container } = render(TopicExampleDiagram, {
      props: { diagram: expanded },
    });
    const svg = container.querySelector("svg")!;
    const rects = Array.from(svg.querySelectorAll("rect"));
    expect(rects).toHaveLength(4);

    const path = svg.querySelector("path[marker-end]")!;
    const [, sx, sy, cx, cy, ex, ey] = path
      .getAttribute("d")!
      .match(
        /^M ([\d.-]+) ([\d.-]+) Q ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)$/,
      )!
      .map(Number);
    const isOnNodeBoundary = (x: number, y: number, rect: SVGRectElement) => {
      const centerX =
        Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2;
      const centerY =
        Number(rect.getAttribute("y")) +
        Number(rect.getAttribute("height")) / 2;
      const halfWidth = Number(rect.getAttribute("width")) / 2;
      const halfHeight = Number(rect.getAttribute("height")) / 2;
      return (
        (Math.abs(x - centerX) === halfWidth &&
          Math.abs(y - centerY) <= halfHeight) ||
        (Math.abs(y - centerY) === halfHeight &&
          Math.abs(x - centerX) <= halfWidth)
      );
    };
    expect(sx).not.toBeNaN();
    expect(sy).not.toBeNaN();
    expect(cx).not.toBeNaN();
    expect(cy).not.toBeNaN();
    expect(isOnNodeBoundary(sx, sy, rects[0])).toBe(true);
    expect(isOnNodeBoundary(ex, ey, rects[3])).toBe(true);

    const viewBox = svg.getAttribute("viewBox")!.split(" ").map(Number);
    const label = Array.from(svg.querySelectorAll("text")).find(
      (text) => text.textContent === "Supplies",
    )!;
    expect(Number(label.getAttribute("x"))).toBeGreaterThanOrEqual(viewBox[0]);
    expect(Number(label.getAttribute("x"))).toBeLessThanOrEqual(viewBox[2]);
    expect(Number(label.getAttribute("y"))).toBeGreaterThanOrEqual(viewBox[1]);
    expect(Number(label.getAttribute("y"))).toBeLessThanOrEqual(viewBox[3]);
  });

  it("renders a finite labelled loop for a flow from a node to itself", () => {
    const selfFlow = {
      ...diagram,
      nodes: [diagram.nodes[0]],
      links: [
        {
          from: "tern",
          to: "tern",
          kind: "flow" as const,
          label: "Recirculated supplies",
          detail: "Supplies return to the same station.",
        },
      ],
    };
    const { container } = render(TopicExampleDiagram, {
      props: { diagram: selfFlow },
    });
    const svg = container.querySelector("svg")!;
    const path = svg.querySelector("path[marker-end]")!;
    const coordinates = path
      .getAttribute("d")!
      .match(/-?\d+(?:\.\d+)?/g)!
      .map(Number);
    const rect = svg.querySelector("rect")!;
    const viewBox = svg.getAttribute("viewBox")!.split(" ").map(Number);
    const label = Array.from(svg.querySelectorAll("text")).find(
      (text) => text.textContent === "Recirculated supplies",
    )!;

    expect(coordinates.every(Number.isFinite)).toBe(true);
    expect(coordinates[0]).toBe(
      Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")),
    );
    expect(coordinates[2]).toBeGreaterThan(coordinates[0]);
    expect(label).not.toBeNull();
    expect(Number(label.getAttribute("x"))).toBeLessThanOrEqual(viewBox[2]);
    expect(Number(label.getAttribute("y"))).toBeGreaterThanOrEqual(viewBox[1]);
  });
});
