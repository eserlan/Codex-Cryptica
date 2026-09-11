/** @vitest-environment jsdom */

import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Minimap from "./Minimap.svelte";

const createCy = () => ({
  on: vi.fn(),
  off: vi.fn(),
  nodes: vi.fn().mockReturnValue({ length: 0 }),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Minimap visibility lifecycle", () => {
  it("does not attach graph listeners while suspended", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
    const cy = createCy();

    render(Minimap, {
      props: { cy: cy as any, isExpanded: true, isSuspended: true },
    });

    expect(cy.on).not.toHaveBeenCalled();
  });

  it("attaches listeners again when resumed", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
    const cy = createCy();
    const view = render(Minimap, {
      props: { cy: cy as any, isExpanded: true, isSuspended: true },
    });

    await view.rerender({
      cy: cy as any,
      isExpanded: true,
      isSuspended: false,
    });

    expect(cy.on).toHaveBeenCalledWith(
      "add remove position data",
      expect.any(Function),
    );
    expect(cy.on).toHaveBeenCalledWith("pan zoom resize", expect.any(Function));
  });
});
