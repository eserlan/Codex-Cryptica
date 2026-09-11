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
  it("uses readable, wrapping long-form typography", () => {
    const { container } = render(EntityDetailModal, {
      props: { entity, onClose: vi.fn() },
    });

    const content = container.querySelector(".seo-md");
    expect(content?.classList.contains("text-lg")).toBe(true);
    expect(content?.classList.contains("leading-relaxed")).toBe(true);
    expect(content?.classList.contains("break-words")).toBe(true);
    expect(content?.classList.contains("text-base")).toBe(false);
    expect(content?.classList.contains("[&_pre]:overflow-x-auto")).toBe(true);
    expect(content?.classList.contains("[&_pre]:max-w-full")).toBe(true);
  });

  it("keeps fenced code blocks from overflowing the modal on mobile", () => {
    const { container } = render(EntityDetailModal, {
      props: {
        entity: {
          ...entity,
          content:
            "```\nA very long unbroken line of preformatted code that would otherwise overflow the modal on narrow screens\n```",
        },
        onClose: vi.fn(),
      },
    });

    const pre = container.querySelector(".seo-md pre");
    expect(pre).toBeTruthy();
    expect(pre?.closest(".seo-md")?.classList.contains("[&_pre]:overflow-x-auto")).toBe(true);
  });

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

  it("offers refinement for historical Hub entries", async () => {
    const onRefine = vi.fn();
    render(EntityDetailModal, {
      props: { entity, onClose: vi.fn(), onRefine },
    });

    await fireEvent.click(screen.getByRole("button", { name: "Refine" }));
    expect(onRefine).toHaveBeenCalledWith(entity);
  });
});
