/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import GeneratorRefinementModal from "./GeneratorRefinementModal.svelte";
import { GeneratorRefinementService } from "$lib/services/GeneratorRefinementService.svelte";

const source = {
  type: "character",
  title: "Mara Venn",
  content: "Mara crosses the flood districts.",
  lore: "She owes the guild a favour.",
  labels: ["courier"],
  status: "draft" as const,
};

if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function () {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}

describe("GeneratorRefinementModal", () => {
  it("submits an instruction and exposes the busy/error contract", async () => {
    const runner = vi
      .fn()
      .mockResolvedValue({ content: "Mara runs before dawn." });
    const service = new GeneratorRefinementService(runner);
    service.start(source);
    const onRequested = vi.fn();

    render(GeneratorRefinementModal, {
      props: {
        open: true,
        service,
        onAccept: vi.fn(),
        onCancel: vi.fn(),
        onRequested,
      },
    });

    const input = screen.getByLabelText("What should change?");
    await fireEvent.input(input, { target: { value: "Make it urgent" } });
    await fireEvent.click(screen.getByRole("button", { name: "Refine" }));

    expect(runner).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Mara Venn" }),
      "Make it urgent",
    );
    expect(onRequested).toHaveBeenCalledWith(false);
    expect(await screen.findByText("Mara runs before dawn.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Use revision" })).toBeTruthy();
  });
});
