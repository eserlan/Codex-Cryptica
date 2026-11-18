/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import PendingImportNotice from "./PendingImportNotice.svelte";

describe("PendingImportNotice", () => {
  it("retries and discards through the callbacks", async () => {
    const onRetry = vi.fn();
    const onDiscard = vi.fn();
    render(PendingImportNotice, { props: { onRetry, onDiscard } });

    expect(screen.getByRole("alert").textContent).toContain(
      "Your generated draft hasn't been added yet.",
    );
    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("disables Retry while a run is in flight", () => {
    render(PendingImportNotice, {
      props: { isRetrying: true, onRetry: vi.fn(), onDiscard: vi.fn() },
    });

    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry.hasAttribute("disabled")).toBe(true);
  });
});
