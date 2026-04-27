/** @vitest-environment jsdom */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { render, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";

// Mock transitions
vi.mock("svelte/transition", () => ({
  fade: () => ({ duration: 0 }),
  fly: () => ({ duration: 0 }),
}));

// Mock Element.prototype.animate for jsdom
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = vi.fn().mockReturnValue({
    finished: Promise.resolve(),
    cancel: vi.fn(),
  });
}

// Mock Svelte client runtime
vi.mock("svelte", async () => {
  // @ts-ignore - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    updateConnection: vi.fn(),
    removeConnection: vi.fn(),
  },
}));

import EdgeEditorModal from "./EdgeEditorModal.svelte";

describe("EdgeEditorModal Dismissal", () => {
  const editingEdge = {
    source: "s1",
    target: "t1",
    label: "related",
    type: "neutral",
  };

  it("should close when Escape key is pressed", async () => {
    const mockEditingEdge: any = editingEdge;
    const { container } = render(EdgeEditorModal, {
      editingEdge: mockEditingEdge,
    });

    await fireEvent.keyDown(window, { key: "Escape" });
    // The component sets editingEdge = null; but since it's a prop, we need to check if it was closed
    // Since we don't have a good way to check bindable prop change from outside in this test setup easily
    // without a wrapper component, I'll check if the modal is gone from the DOM.
    await waitFor(() =>
      expect(container.querySelector(".fixed.inset-0")).toBeNull(),
    );
  });

  it("should close when clicking the backdrop", async () => {
    const mockEditingEdge: any = editingEdge;
    const { container } = render(EdgeEditorModal, {
      editingEdge: mockEditingEdge,
    });

    const backdrop = container.querySelector(".fixed.inset-0");
    expect(backdrop).toBeTruthy();

    await fireEvent.click(backdrop!);
    await waitFor(() =>
      expect(container.querySelector(".fixed.inset-0")).toBeNull(),
    );
  });

  it("should NOT close when clicking the modal content", async () => {
    const mockEditingEdge: any = editingEdge;
    const { container } = render(EdgeEditorModal, {
      editingEdge: mockEditingEdge,
    });

    const modalContent = container.querySelector(".bg-theme-surface");
    expect(modalContent).toBeTruthy();

    await fireEvent.click(modalContent!);
    expect(container.querySelector(".fixed.inset-0")).toBeTruthy();
  });
});
