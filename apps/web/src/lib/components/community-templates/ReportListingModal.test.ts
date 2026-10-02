/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "$lib/services/publishing/PublicEntityTemplateDirectoryService",
  () => ({
    publicEntityTemplateDirectoryService: { reportEntityTemplate: vi.fn() },
  }),
);
vi.mock("$lib/stores/publishing/entity-template-publish-registry", () => ({
  entityTemplatePublishRegistry: {
    hasReported: vi.fn(),
    markReported: vi.fn(),
  },
}));

import ReportListingModal from "./ReportListingModal.svelte";

const err = (message: string, code: string) =>
  Object.assign(new Error(message), { code });

function setup(over: Record<string, unknown> = {}) {
  const props = {
    listingId: "L1",
    title: "Guild Hall",
    report: vi.fn(async () => undefined),
    hasReported: vi.fn(async () => false),
    markReported: vi.fn(async () => undefined),
    ...over,
  };
  render(ReportListingModal, props as any);
  return props;
}

describe("ReportListingModal", () => {
  it("hides the decorative close icon from assistive technology", () => {
    setup();
    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(closeButton.querySelector("span")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("requires a reason before sending anything", async () => {
    const p = setup();
    await fireEvent.click(screen.getByText("Send report"));
    expect(screen.getByRole("alert").textContent).toMatch(/choose a reason/i);
    expect(p.report).not.toHaveBeenCalled();
  });

  it("sends the reason and details, remembers it, and confirms", async () => {
    const p = setup();
    await fireEvent.click(screen.getByLabelText("Spam or misleading"));
    await fireEvent.input(screen.getByLabelText(/More detail/), {
      target: { value: "  Looks fake  " },
    });
    await fireEvent.click(screen.getByText("Send report"));
    expect(
      await screen.findByText(/Thanks\. Your report has been sent/),
    ).toBeTruthy();
    expect(p.report).toHaveBeenCalledWith("L1", {
      reason: "spam",
      details: "Looks fake",
    });
    expect(p.markReported).toHaveBeenCalledWith("L1");
  });

  it("omits empty details", async () => {
    const p = setup();
    await fireEvent.click(screen.getByLabelText("Something else"));
    await fireEvent.click(screen.getByText("Send report"));
    await screen.findByText(/Thanks/);
    expect(p.report).toHaveBeenCalledWith("L1", { reason: "other" });
  });

  it("says so, without a request, when this device already reported the listing", async () => {
    const p = setup({ hasReported: vi.fn(async () => true) });
    expect(await screen.findByText(/already reported this/i)).toBeTruthy();
    expect(screen.queryByText("Send report")).toBeNull();
    expect(p.report).not.toHaveBeenCalled();
  });

  it("treats a server 'already reported' as done and remembers it", async () => {
    const p = setup({
      report: vi.fn(async () => {
        throw err("You've already reported this.", "already_reported");
      }),
    });
    await fireEvent.click(screen.getByLabelText("Spam or misleading"));
    await fireEvent.click(screen.getByText("Send report"));
    expect(await screen.findByText(/already reported this/i)).toBeTruthy();
    expect(p.markReported).toHaveBeenCalledWith("L1");
  });

  it("explains a rate limit and keeps the form for a later retry", async () => {
    const p = setup({
      report: vi.fn(async () => {
        throw err("Too many reports. Please try again later.", "rate_limited");
      }),
    });
    await fireEvent.click(screen.getByLabelText("Spam or misleading"));
    await fireEvent.click(screen.getByText("Send report"));
    expect(
      await screen.findByText("Too many reports. Please try again later."),
    ).toBeTruthy();
    expect(p.markReported).not.toHaveBeenCalled();
    expect(screen.getByText("Send report")).toBeTruthy();
  });

  it("lets the user retry a failed request without a duplicate record", async () => {
    const report = vi
      .fn()
      .mockRejectedValueOnce(
        err("Couldn't reach the template directory.", "network"),
      )
      .mockResolvedValueOnce(undefined);
    const p = setup({ report });
    await fireEvent.click(screen.getByLabelText("Spam or misleading"));
    await fireEvent.click(screen.getByText("Send report"));
    expect(
      await screen.findByText("Couldn't reach the template directory."),
    ).toBeTruthy();
    expect(p.markReported).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByText("Send report"));
    expect(await screen.findByText(/Thanks/)).toBeTruthy();
    await waitFor(() => expect(p.markReported).toHaveBeenCalledTimes(1));
  });

  it("can be cancelled without sending", async () => {
    const onClose = vi.fn();
    const p = setup({ onClose });
    await fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
    expect(p.report).not.toHaveBeenCalled();
  });

  it("sends only one report when Send is pressed twice quickly", async () => {
    let release: () => void = () => {};
    const report = vi.fn(
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    setup({ report });
    await fireEvent.click(screen.getByLabelText("Spam or misleading"));
    const button = screen.getByText("Send report") as HTMLButtonElement;
    button.click();
    button.click();
    expect(report).toHaveBeenCalledTimes(1);
    release();
    expect(await screen.findByText(/Thanks/)).toBeTruthy();
  });
});
