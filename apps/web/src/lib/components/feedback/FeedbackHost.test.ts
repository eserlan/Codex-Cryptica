/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { feedbackDialog } from "#lib/stores/ui/feedback-dialog.svelte.js";
import FeedbackHost from "./FeedbackHost.svelte";

// jsdom has no Web Animations API, which Svelte transitions use on close.
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = (() => {
    const animation = {
      onfinish: null as null | (() => void),
      cancel() {},
      finished: Promise.resolve(),
    };
    queueMicrotask(() => animation.onfinish?.());
    return animation;
  }) as unknown as Element["animate"];
}

describe("FeedbackHost", () => {
  it("loads nothing while the dialog is closed", () => {
    feedbackDialog.close();
    render(FeedbackHost);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("loads and shows the dialog when it is opened", async () => {
    render(FeedbackHost);
    feedbackDialog.open({ area: "tabletop" });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    feedbackDialog.close();
  });
});
