/** @vitest-environment jsdom */

// Separate file so the dynamic import of "../zen/ZenView.svelte" is mocked
// to always reject for every test here — Vitest/ESM caches a module's
// resolution (success or failure) for the life of a module registry, so a
// toggleable flag inside one shared test file cannot reliably exercise both
// the success and failure paths for the same specifier (see
// EmbeddedEntityView.test.ts for the success-path coverage).

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = vi.fn().mockReturnValue({
    finished: Promise.resolve(),
    cancel: vi.fn(),
    onfinish: null,
  });
}

vi.mock("../zen/ZenView.svelte", () => {
  throw new Error("simulated chunk load failure");
});

vi.mock("$lib/stores/ui/navigation", () => ({
  focusEntity: vi.fn(),
}));

vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: {
    isEntityExplorerWorkspace: false,
    clearEntityExplorerWorkspaceFocus: vi.fn(),
  },
}));

import EmbeddedEntityView from "./EmbeddedEntityView.svelte";

describe("EmbeddedEntityView (ZenView chunk load failure)", () => {
  it("fails closed with a retryable message instead of crashing the render tree", async () => {
    render(EmbeddedEntityView, { entityId: "test-entity-1" });

    expect(
      await screen.findByTestId("embedded-entity-view-error"),
    ).toBeTruthy();
    expect(screen.queryByTestId("zen-view-stub")).toBeNull();
    expect(screen.getByTestId("embedded-entity-view-retry")).toBeTruthy();
  });
});
