/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HelpSourceChips from "./HelpSourceChips.svelte";

describe("HelpSourceChips", () => {
  it("renders clickable buttons for help articles and calls onOpenArticle", async () => {
    const onOpenArticle = vi.fn();
    render(HelpSourceChips, {
      sources: [
        {
          id: "connections-tab#0",
          title: "Connections Tab",
          helpId: "connections-tab",
        },
      ],
      onOpenArticle,
    });

    const button = screen.getByRole("button", { name: "Connections Tab" });
    expect(button).toBeDefined();
    await fireEvent.click(button);
    expect(onOpenArticle).toHaveBeenCalledWith("connections-tab");
  });

  it("renders non-clickable span for sources without helpId", () => {
    render(HelpSourceChips, {
      sources: [
        {
          id: "feature#0",
          title: "Graph View",
        },
      ],
      onOpenArticle: vi.fn(),
    });

    expect(screen.queryByRole("button", { name: "Graph View" })).toBeNull();
    expect(screen.getByText("Graph View")).toBeDefined();
  });

  it("deduplicates sources with identical helpId or title", () => {
    const onOpenArticle = vi.fn();
    render(HelpSourceChips, {
      sources: [
        {
          id: "connections-tab#0",
          title: "Connections Tab",
          helpId: "connections-tab",
        },
        {
          id: "connections-tab#1",
          title: "Connections Tab",
          helpId: "connections-tab",
        },
      ],
      onOpenArticle,
    });

    const buttons = screen.getAllByRole("button", { name: "Connections Tab" });
    expect(buttons).toHaveLength(1);
  });
});
