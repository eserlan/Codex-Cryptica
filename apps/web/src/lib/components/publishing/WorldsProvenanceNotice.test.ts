/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import WorldsProvenanceNotice from "./WorldsProvenanceNotice.svelte";
import { PUBLIC_WORLDS_NOTICE } from "$lib/config/public-worlds-notice";

describe("WorldsProvenanceNotice", () => {
  it("renders the provenance header, body text, and author responsibility without obtrusive styling", () => {
    render(WorldsProvenanceNotice, { onReport: vi.fn() });

    expect(
      screen.getByText(PUBLIC_WORLDS_NOTICE.PROVENANCE_HEADER),
    ).toBeDefined();
    expect(
      screen.getByText(PUBLIC_WORLDS_NOTICE.PROVENANCE_TEXT),
    ).toBeDefined();
    expect(
      screen.getByText(PUBLIC_WORLDS_NOTICE.AUTHOR_RESPONSIBILITY_TEXT),
    ).toBeDefined();
  });

  it("renders a working report copyright concern button/link that invokes onReport", async () => {
    const onReport = vi.fn();
    render(WorldsProvenanceNotice, { onReport });

    const reportBtn = screen.getByRole("button", {
      name: PUBLIC_WORLDS_NOTICE.REPORT_ACTION_LABEL,
    });
    expect(reportBtn).toBeDefined();

    await fireEvent.click(reportBtn);
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it("links to the publishing guidelines / Terms of Use", () => {
    render(WorldsProvenanceNotice, { onReport: vi.fn() });

    const termsLink = screen.getByRole("link", {
      name: PUBLIC_WORLDS_NOTICE.TERMS_OF_USE_LABEL,
    });
    expect(termsLink.getAttribute("href")).toBe(
      PUBLIC_WORLDS_NOTICE.TERMS_OF_USE_URL,
    );
  });
});
