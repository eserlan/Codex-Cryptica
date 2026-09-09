/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

import PresentationSyntaxHelpModal from "./PresentationSyntaxHelpModal.svelte";

describe("PresentationSyntaxHelpModal", () => {
  it("renders the syntax guide content", () => {
    render(PresentationSyntaxHelpModal, { onClose: vi.fn() });

    expect(
      screen.getByTestId("presentation-syntax-help-modal"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "In the Visual Builder, right-click a field chip to choose a compatible display mode or hide its label.",
      ),
    ).toBeTruthy();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(PresentationSyntaxHelpModal, { onClose });

    await fireEvent.click(screen.getByLabelText("Close syntax guide"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the 'Got it' button is clicked", async () => {
    const onClose = vi.fn();
    render(PresentationSyntaxHelpModal, { onClose });

    await fireEvent.click(screen.getByText("Got it"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when clicking inside the dialog content", async () => {
    const onClose = vi.fn();
    render(PresentationSyntaxHelpModal, { onClose });

    await fireEvent.click(screen.getByTestId("presentation-syntax-help-modal"));

    expect(onClose).not.toHaveBeenCalled();
  });
});
