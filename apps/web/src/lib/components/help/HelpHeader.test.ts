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
    setSearchQuery: vi.fn(),
    openHelpWindow: vi.fn(),
  },
}));

import HelpHeader from "./HelpHeader.svelte";

describe("HelpHeader", () => {
  it("offers Report a problem and opens the dialog for the help area", async () => {
    open.mockClear();
    render(HelpHeader, { props: {} });
    await fireEvent.click(
      screen.getByRole("button", { name: "Report a problem" }),
    );
    expect(open).toHaveBeenCalledWith({ area: "help" });
  });
});
