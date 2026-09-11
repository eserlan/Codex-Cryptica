/** @vitest-environment jsdom */

import { render, fireEvent, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";

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

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    updateConnection: vi.fn(),
    removeConnection: vi.fn(),
  },
}));

import EdgeEditorModal from "./EdgeEditorModal.svelte";
import { vault } from "$lib/stores/vault.svelte";

const testVault = vault as unknown as { isGuest: boolean };

describe("EdgeEditorModal Dismissal", () => {
  const editingEdge = {
    source: "s1",
    target: "t1",
    label: "related",
    type: "rivals_of",
  };

  afterEach(() => {
    testVault.isGuest = false;
  });

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

    const backdrop = screen.getByRole("button", { name: "Close dialog" });
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

  it("shows a read-only full label when a guest opens an edge", () => {
    testVault.isGuest = true;

    render(EdgeEditorModal, { editingEdge });

    expect(
      screen.getByRole("heading", { name: "Connection details" }),
    ).toBeTruthy();
    const label = screen.getByLabelText("Label") as HTMLInputElement;
    const relationshipNature = screen.getByLabelText(
      "Relationship Nature",
    ) as HTMLInputElement;
    expect(label.value).toBe("related");
    expect(label.readOnly).toBe(true);
    expect(relationshipNature.value).toBe("rivals_of");
    expect(relationshipNature.readOnly).toBe(true);
  });
});
