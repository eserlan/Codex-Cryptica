/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const open = vi.hoisted(() => vi.fn());
vi.mock("#lib/stores/ui/feedback-dialog.svelte.js", () => ({
  feedbackDialog: { open },
}));

import ReportProblemButton from "./ReportProblemButton.svelte";

describe("ReportProblemButton", () => {
  it("renders a button named Report a problem", () => {
    render(ReportProblemButton, { props: {} });
    const button = screen.getByRole("button", { name: "Report a problem" });
    expect(button.getAttribute("type")).toBe("button");
  });

  it("opens the dialog with its area and nothing else", async () => {
    open.mockClear();
    render(ReportProblemButton, { props: { area: "tabletop" } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Report a problem" }),
    );
    expect(open).toHaveBeenCalledWith({ area: "tabletop" });
  });
});
