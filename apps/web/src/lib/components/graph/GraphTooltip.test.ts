/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import { FANTASY_DARK } from "schema";
import GraphTooltip from "./GraphTooltip.svelte";

const CATEGORIES = vi.hoisted(() => [
  {
    id: "location",
    label: "Location",
    icon: "lucide:map-pin",
    color: "#4ade80",
  },
]);

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: CATEGORIES,
    getCategory: (id: string) => CATEGORIES.find((c) => c.id === id),
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: { activeTheme: FANTASY_DARK },
}));

vi.mock("svelte/transition", () => ({
  fly: () => ({ duration: 0 }),
}));

const entity = (type: string) => ({
  id: "e1",
  title: "The Ashen Reach",
  type,
  content: "A blasted waste.",
  connections: [],
  labels: [],
  aliases: [],
  status: "active" as const,
});

const renderTooltip = (type: string) =>
  render(GraphTooltip, {
    hoveredEntity: entity(type),
    hoverPosition: { x: 10, y: 10 },
  });

describe("GraphTooltip entity type (issue #2680)", () => {
  it("names the entity type in words, so type is never colour-only", () => {
    const { getByTestId } = renderTooltip("location");

    const chip = getByTestId("graph-tooltip-type");
    expect(chip.textContent?.trim()).toBe("Location");
    // The type icon rides along with the label.
    expect(chip.querySelector("span")?.className).toContain(
      "icon-[lucide--map-pin]",
    );
  });

  it("omits the chip for a type with no registered category", () => {
    const { queryByTestId } = renderTooltip("starship");

    expect(queryByTestId("graph-tooltip-type")).toBeNull();
  });
});
