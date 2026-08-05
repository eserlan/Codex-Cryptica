/** @vitest-environment jsdom */

import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import StarSystemDiagram from "./StarSystemDiagram.svelte";
import type { StarSystemBody } from "generator-engine";

const SAMPLE_BODIES: StarSystemBody[] = [
  { name: "Verdant-4", type: "Temperate World", distanceAU: 1.2 },
];

describe("StarSystemDiagram", () => {
  it("renders nothing when there are no bodies", () => {
    const { container } = render(StarSystemDiagram, {
      props: { bodies: [] },
    });
    expect(container.querySelector("svg")).toBeNull();
  });

  it("draws a scattered clump of small rocks for an asteroid belt instead of a solid body", () => {
    const bodies: StarSystemBody[] = [
      { name: "Hesperia Belt", type: "Asteroid Belt" },
    ];
    const { container } = render(StarSystemDiagram, { props: { bodies } });
    const rocks = container.querySelectorAll("circle.fill-theme-muted");
    expect(rocks.length).toBeGreaterThan(3);
    // No single big body circle standing in for the belt.
    expect(container.querySelector("circle.fill-theme-accent")).toBeNull();
    const positions = new Set(
      Array.from(rocks).map(
        (r) => `${r.getAttribute("cx")},${r.getAttribute("cy")}`,
      ),
    );
    expect(positions.size).toBe(rocks.length);
  });

  it("draws a tilted ring ellipse around a ringed world", () => {
    const bodies: StarSystemBody[] = [
      { name: "Sovereign-4", type: "Ringed World" },
    ];
    const { container } = render(StarSystemDiagram, { props: { bodies } });
    const ring = container.querySelector("ellipse");
    expect(ring).not.toBeNull();
    expect(ring?.getAttribute("transform")).toMatch(/rotate\(/);
    // The planet itself is still a normal solid circle underneath the ring.
    const planet = container.querySelector("circle.stroke-theme-border");
    expect(planet).not.toBeNull();
    expect(planet?.getAttribute("style")).toContain("fill:");
  });

  it("keeps a ringed world's name label clear of the tilted ring's actual bottom edge", () => {
    const bodies: StarSystemBody[] = [
      { name: "Idris Deep II", type: "Ringed World" },
    ];
    const { container, getByText } = render(StarSystemDiagram, {
      props: { bodies },
    });
    const ring = container.querySelector("ellipse")!;
    const cy = Number(ring.getAttribute("cy"));
    const rx = Number(ring.getAttribute("rx"));
    const ry = Number(ring.getAttribute("ry"));
    const angle = (18 * Math.PI) / 180;
    const ringHalfHeight = Math.sqrt(
      (rx * Math.sin(angle)) ** 2 + (ry * Math.cos(angle)) ** 2,
    );
    const ringBottom = cy + ringHalfHeight;

    const label = getByText("Idris Deep II");
    const labelY = Number(label.getAttribute("y"));
    expect(labelY).toBeGreaterThan(ringBottom);
  });

  it("keeps an asteroid belt's name label clear of the lowest scattered rock", () => {
    const bodies: StarSystemBody[] = [
      { name: "Hesperia Belt", type: "Asteroid Belt" },
    ];
    const { container, getByText } = render(StarSystemDiagram, {
      props: { bodies },
    });
    const rocks = Array.from(
      container.querySelectorAll("circle.fill-theme-muted"),
    );
    const lowestRockBottom = Math.max(
      ...rocks.map(
        (r) => Number(r.getAttribute("cy")) + Number(r.getAttribute("r")),
      ),
    );
    const label = getByText("Hesperia Belt");
    const labelY = Number(label.getAttribute("y"));
    expect(labelY).toBeGreaterThan(lowestRockBottom);
  });

  it("draws a plain solid circle for an ordinary body", () => {
    const bodies: StarSystemBody[] = [
      { name: "Verdant-4", type: "Temperate World" },
    ];
    const { container } = render(StarSystemDiagram, { props: { bodies } });
    expect(container.querySelector("ellipse")).toBeNull();
    expect(container.querySelector("circle.fill-none")).toBeNull();
    const planet = container.querySelector("circle.stroke-theme-border");
    expect(planet).not.toBeNull();
    expect(planet?.getAttribute("style")).toContain("fill:");
  });

  it("colors different planet types differently, and falls back to the flat accent color for an unrecognized type", () => {
    const gasGiant = render(StarSystemDiagram, {
      props: { bodies: [{ name: "A", type: "Gas Giant" }] },
    });
    const oceanWorld = render(StarSystemDiagram, {
      props: { bodies: [{ name: "B", type: "Ocean World" }] },
    });
    const gasGiantFill = gasGiant.container
      .querySelector("circle.stroke-theme-border")
      ?.getAttribute("style");
    const oceanFill = oceanWorld.container
      .querySelector("circle.stroke-theme-border")
      ?.getAttribute("style");
    expect(gasGiantFill).toBeTruthy();
    expect(oceanFill).toBeTruthy();
    expect(gasGiantFill).not.toBe(oceanFill);

    const unknownType = render(StarSystemDiagram, {
      props: { bodies: [{ name: "C", type: "Some Invented Type" }] },
    });
    const unknownCircle = unknownType.container.querySelector(
      "circle.fill-theme-accent",
    );
    expect(unknownCircle).not.toBeNull();
    expect(unknownCircle?.getAttribute("style")).toBeFalsy();
  });

  it("draws AU gridlines and per-body AU labels when distanceAU is provided", () => {
    const bodies: StarSystemBody[] = [
      { name: "Verdant-4", type: "Temperate World", distanceAU: 1.2 },
      { name: "Outer Drift", type: "Ice Giant", distanceAU: 18 },
    ];
    const { container, getByText } = render(StarSystemDiagram, {
      props: { bodies },
    });
    const gridlines = container.querySelectorAll(
      'line[stroke-dasharray="1 4"]',
    );
    expect(gridlines.length).toBeGreaterThan(0);
    expect(getByText("1.2 AU")).toBeTruthy();
    expect(getByText("18 AU")).toBeTruthy();
  });

  it("colors the star with the given spectral type's approximate color", () => {
    const bodies: StarSystemBody[] = [
      { name: "Verdant-4", type: "Temperate World" },
    ];
    const { container } = render(StarSystemDiagram, {
      props: { bodies, starType: "M" },
    });
    const circles = container.querySelectorAll("circle");
    const star = circles[0];
    expect(star.getAttribute("style")).toContain("fill:");
    expect(star.getAttribute("class") ?? "").not.toContain(
      "fill-theme-primary",
    );
  });

  it("renders icon-only toolbar buttons for copy image, fit to box, and fit to screen", () => {
    const { getByLabelText } = render(StarSystemDiagram, {
      props: { bodies: SAMPLE_BODIES },
    });
    expect(getByLabelText("Copy diagram as image")).toBeTruthy();
    expect(getByLabelText("Fit to box")).toBeTruthy();
    expect(getByLabelText("Fit diagram to screen")).toBeTruthy();
  });

  it("toggles between fit-to-box and actual size when the fit button is clicked", async () => {
    const { getByLabelText, container } = render(StarSystemDiagram, {
      props: { bodies: SAMPLE_BODIES },
    });
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("style")).toContain("min-width");
    expect(svg.getAttribute("class")).not.toContain("w-full");

    await fireEvent.click(getByLabelText("Fit to box"));

    expect(svg.getAttribute("style")).toBeNull();
    expect(svg.getAttribute("class")).toContain("w-full");
    expect(getByLabelText("Show actual size")).toBeTruthy();
  });

  it("opens the fullscreen overlay on click and closes it via the close button", async () => {
    const { getByLabelText, getByTitle, container, queryByRole } = render(
      StarSystemDiagram,
      { props: { bodies: SAMPLE_BODIES } },
    );
    expect(queryByRole("dialog")).toBeNull();

    await fireEvent.click(getByLabelText("Fit diagram to screen"));
    expect(queryByRole("dialog")).toBeTruthy();
    // Fullscreen view renders its own <svg>, in addition to the inline one.
    expect(container.querySelectorAll("svg").length).toBe(2);

    await fireEvent.click(getByTitle("Close"));
    expect(queryByRole("dialog")).toBeNull();
  });

  it("closes the fullscreen overlay on Escape", async () => {
    const { getByLabelText, queryByRole } = render(StarSystemDiagram, {
      props: { bodies: SAMPLE_BODIES },
    });
    await fireEvent.click(getByLabelText("Fit diagram to screen"));
    expect(queryByRole("dialog")).toBeTruthy();

    await fireEvent.keyDown(queryByRole("dialog")!, { key: "Escape" });
    expect(queryByRole("dialog")).toBeNull();
  });
});
