/** @vitest-environment jsdom */

/**
 * The cytoscape canvas is `aria-hidden` and needs a pointer, so the table view
 * is the graph's operable equivalent (see graph-a11y.ts). That only helps if
 * it is reachable *from the graph*, with the same wording the screen-reader
 * description uses, so this pins both.
 *
 * Rendered in the mobile menu-open state: on mobile the toolbar skips Minimap
 * and GraphViewPresets, so no extra mocking is needed (same reasoning as
 * onboarding-selector-contract.test.ts).
 */

import { render, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";

import GraphToolbar from "./GraphToolbar.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

// Opening the mobile menu runs a Svelte transition (same shim as
// EdgeEditorModal.test.ts).
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = vi.fn().mockReturnValue({
    finished: Promise.resolve(),
    cancel: vi.fn(),
  });
}

const renderToolbar = () =>
  render(GraphToolbar, {
    props: {
      cy: undefined,
      isLayoutRunning: false,
      onApplyLayout: async () => {},
      selectedCount: 0,
    },
  });

afterEach(() => {
  layoutUIStore.isMobile = false;
});

describe("GraphToolbar accessible alternative", () => {
  it("offers a labelled route to the table view from the graph controls", async () => {
    layoutUIStore.isMobile = true;
    const { getByTestId } = renderToolbar();

    await fireEvent.click(getByTestId("graph-controls-fab"));

    const link = getByTestId("graph-browse-as-table") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toMatch(/\/table$/);
    // Wording must match the screen-reader description, which tells the user
    // to look for "Browse as table".
    expect(link.textContent?.trim()).toBe("Browse as table");
  });
});
