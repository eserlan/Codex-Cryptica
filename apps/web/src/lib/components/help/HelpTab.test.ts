/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const open = vi.hoisted(() => vi.fn());
vi.mock("$lib/stores/ui/feedback-dialog.svelte", () => ({
  feedbackDialog: { open },
}));
vi.mock("$lib/stores/help.svelte", () => ({
  helpStore: {
    searchQuery: "",
    searchResults: [],
    expandedId: null,
    setSearchQuery: vi.fn(),
    openHelpWindow: vi.fn(),
    startTour: vi.fn(),
    ensureIndex: vi.fn(),
    toggleArticle: vi.fn(),
    copyShareLink: vi.fn(),
  },
}));
vi.mock("$lib/services/parser", () => ({ parserService: { parse: vi.fn() } }));
vi.mock("$lib/utils/markdown", () => ({ renderMarkdown: (s: string) => s }));

import HelpTab from "./HelpTab.svelte";

describe("HelpTab", () => {
  it("offers Report a problem once, for the help area", async () => {
    open.mockClear();
    render(HelpTab, { props: {} });
    expect(
      screen.getAllByRole("button", { name: "Report a problem" }),
    ).toHaveLength(1);
    await fireEvent.click(
      screen.getByRole("button", { name: "Report a problem" }),
    );
    expect(open).toHaveBeenCalledWith({ area: "help" });
  });
});
