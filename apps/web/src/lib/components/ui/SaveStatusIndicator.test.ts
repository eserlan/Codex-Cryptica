/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockVaultState } = vi.hoisted(() => ({
  mockVaultState: {
    status: "idle",
    errorMessage: null,
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: mockVaultState,
}));

import SaveStatusIndicator from "./SaveStatusIndicator.svelte";

describe("SaveStatusIndicator", () => {
  beforeEach(() => {
    mockVaultState.status = "idle";
    mockVaultState.errorMessage = null;
  });

  it("renders nothing when status is idle", () => {
    const { container } = render(SaveStatusIndicator, {
      props: { status: "idle" },
    });
    expect(screen.queryByTestId("save-indicator-saving")).toBeNull();
    expect(screen.queryByTestId("save-indicator-saved")).toBeNull();
    expect(screen.queryByTestId("save-indicator-error")).toBeNull();
    expect(container.textContent?.trim()).toBe("");
  });

  it("renders saving state with polite live region", () => {
    render(SaveStatusIndicator, {
      props: { status: "saving" },
    });

    const indicator = screen.getByTestId("save-indicator-saving");
    expect(indicator).toBeTruthy();
    expect(indicator.getAttribute("role")).toBe("status");
    expect(indicator.getAttribute("aria-live")).toBe("polite");
    expect(indicator.textContent).toContain("Saving…");
  });

  it("renders saved state with polite live region", () => {
    render(SaveStatusIndicator, {
      props: { status: "saved" },
    });

    const indicator = screen.getByTestId("save-indicator-saved");
    expect(indicator).toBeTruthy();
    expect(indicator.getAttribute("role")).toBe("status");
    expect(indicator.getAttribute("aria-live")).toBe("polite");
    expect(indicator.textContent).toContain("Saved");
  });

  it("renders error state with assertive live region and alert role", () => {
    render(SaveStatusIndicator, {
      props: {
        status: "error",
        errorMessage: "Disk write permission denied",
      },
    });

    const indicator = screen.getByTestId("save-indicator-error");
    expect(indicator).toBeTruthy();
    expect(indicator.getAttribute("role")).toBe("alert");
    expect(indicator.getAttribute("aria-live")).toBe("assertive");
    expect(indicator.getAttribute("title")).toBe(
      "Disk write permission denied",
    );
    expect(indicator.textContent).toContain("Save failed");
  });

  it("reads from vault store dependency when props are omitted", () => {
    mockVaultState.status = "saving";

    render(SaveStatusIndicator, {});

    expect(screen.getByTestId("save-indicator-saving")).toBeTruthy();
  });
});
