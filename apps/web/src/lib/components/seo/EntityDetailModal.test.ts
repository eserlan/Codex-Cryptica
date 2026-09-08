/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import EntityDetailModal from "./EntityDetailModal.svelte";

const entity = {
  id: "history-1",
  type: "faction",
  title: "The Hollow Crown",
  summary: "A fallen order.",
  content: "*A fallen order.*\n\nTheir gates are sealed.",
  lore: "The sanctuary is hidden.",
  labels: ["faction"],
  status: "active" as const,
  reuseEnabled: true,
  pinned: false,
  createdOrder: 1,
};

describe("EntityDetailModal", () => {
  it("copies a historical result and shows success feedback", async () => {
    const onCopy = vi.fn().mockResolvedValue(true);

    render(EntityDetailModal, {
      props: { entity, onClose: vi.fn(), onCopy },
    });

    await fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(onCopy).toHaveBeenCalledWith(entity);
    expect(screen.getAllByText("Copied!")).not.toHaveLength(0);
  });

  it("keeps the modal open and reports a failed copy", async () => {
    const onCopy = vi.fn().mockResolvedValue(false);

    render(EntityDetailModal, {
      props: { entity, onClose: vi.fn(), onCopy },
    });

    await fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Could not copy.")).toBeTruthy();
  });
});
