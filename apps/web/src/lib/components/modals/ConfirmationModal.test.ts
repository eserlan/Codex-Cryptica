/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmationModal from "./ConfirmationModal.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

vi.mock("$lib/actions/focusTrap", () => ({
  focusTrap: () => ({ destroy() {} }),
}));

describe("ConfirmationModal", () => {
  beforeEach(() => {
    if (!Element.prototype.animate) {
      Element.prototype.animate = vi.fn(
        () =>
          ({
            finished: Promise.resolve(),
            cancel: vi.fn(),
            play: vi.fn(),
          }) as unknown as Animation,
      );
    }
    notificationStore.confirmationDialog = {
      open: true,
      title: "Delete this entry?",
      message: "This cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Keep",
      isDangerous: true,
      resolve: null,
    };
  });

  it("hides the dangerous icon from screen readers and marks both actions as buttons", () => {
    render(ConfirmationModal);

    const icon = document.querySelector(".icon-\\[lucide--triangle-alert\\]");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");

    const confirmButton = screen.getByText("Delete").closest("button")!;
    const cancelButton = screen.getByText("Keep").closest("button")!;
    expect(confirmButton?.getAttribute("type")).toBe("button");
    expect(cancelButton?.getAttribute("type")).toBe("button");
  });

  it("hides the non-dangerous icon from screen readers", () => {
    notificationStore.confirmationDialog = {
      open: true,
      title: "Continue?",
      message: "Are you sure?",
      isDangerous: false,
      resolve: null,
    };

    render(ConfirmationModal);

    const icon = document.querySelector(".icon-\\[lucide--help-circle\\]");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });
});
