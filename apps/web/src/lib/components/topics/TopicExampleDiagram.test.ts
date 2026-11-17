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
    const titleId = svg.getAttribute("aria-labelledby")!.split(" ")[0];
    expect(
      container.querySelector(`#${CSS.escape(titleId)}`)?.textContent,
    ).toBe(diagram.title);
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
});
