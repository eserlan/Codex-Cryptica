/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/stores/stat-sheet-templates.svelte", () => ({
  statSheetTemplates: { importPublicTemplate: vi.fn() },
}));

import TemplateImportModal from "./TemplateImportModal.svelte";

describe("TemplateImportModal", () => {
  it("hides the decorative close icon and closes when requested", async () => {
    const onClose = vi.fn();
    render(TemplateImportModal, {
      packageData: { template: { name: "Guild Hall" } } as any,
      onClose,
    });

    const closeButton = screen.getByRole("button", {
      name: "Close import dialog",
    });
    expect(closeButton.querySelector("span")?.getAttribute("aria-hidden")).toBe(
      "true",
    );

    await fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
