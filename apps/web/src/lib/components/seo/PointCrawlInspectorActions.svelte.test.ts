/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import PointCrawlInspectorActions from "./PointCrawlInspectorActions.svelte";

describe("PointCrawlInspectorActions", () => {
  it("shows a local error when the async refinement callback rejects", async () => {
    render(PointCrawlInspectorActions, {
      props: {
        target: { kind: "node", id: "n1" },
        label: "Regenerate location",
        onRegeneratePart: vi
          .fn()
          .mockRejectedValue(new Error("refinement chunk unavailable")),
      },
    });

    await fireEvent.click(
      screen.getByTestId("point-crawl-inspector-regenerate"),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Your point crawl was left unchanged.",
    );
  });
});
