/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import PointCrawlWorkedExampleDiagram from "./PointCrawlWorkedExampleDiagram.svelte";

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/environment", () => ({ browser: false }));

describe("PointCrawlWorkedExampleDiagram (#4370)", () => {
  it("renders the exact six named nodes of the worked example", () => {
    render(PointCrawlWorkedExampleDiagram);

    expect(screen.getByTestId("node-oakhaven")).toBeTruthy();
    expect(screen.getByTestId("node-toll-bridge")).toBeTruthy();
    expect(screen.getByTestId("node-reed-causeway")).toBeTruthy();
    expect(screen.getByTestId("node-old-watchtower")).toBeTruthy();
    expect(screen.getByTestId("node-hermits-cairn")).toBeTruthy();
    expect(screen.getByTestId("node-morzans-crypt")).toBeTruthy();

    expect(screen.getAllByText("Oakhaven").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Toll Bridge").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Reed Causeway").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("Old Watchtower").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("Hermit's Cairn").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("Morzan's Crypt").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("reflects existing routes, travel times, hazards, and hidden routes in the diagram", () => {
    render(PointCrawlWorkedExampleDiagram);

    // Oakhaven to Toll Bridge
    expect(screen.getByTestId("route-oakhaven-toll-bridge")).toBeTruthy();
    // Oakhaven to Reed Causeway
    expect(screen.getByTestId("route-oakhaven-reed-causeway")).toBeTruthy();
    // Toll Bridge to Old Watchtower loop
    expect(
      screen.getByTestId("route-toll-bridge-watchtower-loop"),
    ).toBeTruthy();
    // Reed Causeway to Old Watchtower
    expect(screen.getByTestId("route-causeway-watchtower")).toBeTruthy();
    // Reed Causeway to Hermit's Cairn (conditional)
    expect(screen.getByTestId("route-causeway-hermits-cairn")).toBeTruthy();
    // Watchtower to Crypt (exposed approach)
    expect(screen.getByTestId("route-watchtower-crypt-exposed")).toBeTruthy();
    // Hermit to Crypt (hidden approach)
    expect(screen.getByTestId("route-hermit-crypt-hidden")).toBeTruthy();
  });

  it("shows the road loop returning from Old Watchtower to Toll Bridge", () => {
    render(PointCrawlWorkedExampleDiagram);

    const loop = screen.getByTestId("route-toll-bridge-watchtower-loop");
    const line = loop.querySelector("line");
    const row = screen
      .getAllByRole("rowheader", { name: "Old Watchtower" })
      .map((header) => header.closest("tr"))
      .find((candidate) => candidate?.textContent?.includes("Road loop"));

    expect(line?.getAttribute("x1")).toBe("451");
    expect(line?.getAttribute("x2")).toBe("289");
    expect(row?.textContent).toContain("Toll Bridge");
  });

  it("distinguishes hidden and conditional routes with distinct line styling", () => {
    render(PointCrawlWorkedExampleDiagram);

    const hiddenRouteLine = screen
      .getByTestId("route-hermit-crypt-hidden")
      .querySelector("line");
    expect(hiddenRouteLine?.getAttribute("stroke-dasharray")).toBe("6 4");

    const conditionalRouteLine = screen
      .getByTestId("route-causeway-hermits-cairn")
      .querySelector("line");
    expect(conditionalRouteLine?.getAttribute("stroke-dasharray")).toBe("4 3");
  });

  it("provides an accessible, crawlable text table representation for screen readers and no-JS", () => {
    render(PointCrawlWorkedExampleDiagram);

    const table = screen.getByRole("table");
    expect(table).toBeTruthy();

    // Check table headers
    expect(screen.getByRole("columnheader", { name: "From" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "To" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Time" })).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "Trade-off / Consequences" }),
    ).toBeTruthy();

    // Check key route data rows
    expect(screen.getAllByRole("rowheader", { name: "Oakhaven" }).length).toBe(
      2,
    );
    expect(
      screen.queryAllByRole("rowheader", { name: "Toll Bridge" }).length,
    ).toBe(0);
    expect(
      screen.getAllByRole("rowheader", { name: "Old Watchtower" }).length,
    ).toBe(2);
    expect(
      screen.getAllByRole("rowheader", { name: "Hermit's Cairn" }).length,
    ).toBe(1);
  });

  it("includes a genuine next step CTA linking to the Point Crawl Generator", () => {
    render(PointCrawlWorkedExampleDiagram);

    const cta = screen.getByTestId("diagram-generator-cta");
    expect(cta).toBeTruthy();

    const link = screen.getByRole("link", {
      name: /Try the Point Crawl Generator/i,
    });
    expect(link.getAttribute("href")).toBe("/generators/point-crawl");
  });
});
