/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DelveSectorNode from "./DelveSectorNode.svelte";

describe("DelveSectorNode", () => {
  it("renders the sector identity, theme, and description", () => {
    render(DelveSectorNode, {
      props: {
        data: {
          id: "sector-2",
          name: "The Hollowed Choir",
          theme: "Resonant glass",
          description: "Broken hymns ripple through translucent walls.",
          order: 2,
        },
      },
    });

    expect(
      screen.getByRole("region", {
        name: "Sector 2: The Hollowed Choir",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Resonant glass")).toBeTruthy();
    expect(
      screen.getByText("Broken hymns ripple through translucent walls."),
    ).toBeTruthy();
  });

  it("hides the generic Dungeon Chamber fallback", () => {
    render(DelveSectorNode, {
      props: {
        data: {
          id: "sector-1",
          name: "Upper Passages",
          theme: "Dungeon Chamber",
          description: "",
          order: 1,
        },
      },
    });

    expect(screen.queryByText("Dungeon Chamber")).toBeNull();
  });
});
