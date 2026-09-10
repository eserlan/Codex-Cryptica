/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureCorrectionForm from "./AdventureCorrectionForm.svelte";

function manager(overrides: Record<string, unknown> = {}) {
  return {
    session: {
      visibleState: {
        location: { id: "loc-1", text: "The lantern road" },
        situation: undefined,
      },
    },
    readOnly: false,
    submitCorrection: vi.fn(async () => "applied"),
    ...overrides,
  } as any;
}

describe("AdventureCorrectionForm", () => {
  it("renders nothing for a read-only session", () => {
    render(AdventureCorrectionForm, { manager: manager({ readOnly: true }) });
    expect(screen.queryByText(/fix something wrong/i)).toBeNull();
  });

  it("does not submit when nothing changed", async () => {
    const m = manager();
    render(AdventureCorrectionForm, { manager: m });

    await fireEvent.click(
      screen.getByText("Fix something wrong with the current situation"),
    );
    await fireEvent.click(screen.getByText("Save correction"));

    expect(m.submitCorrection).not.toHaveBeenCalled();
  });

  it("submits only the changed field", async () => {
    const m = manager();
    render(AdventureCorrectionForm, { manager: m });

    await fireEvent.click(
      screen.getByText("Fix something wrong with the current situation"),
    );
    const locationInput = screen.getByLabelText("Location") as HTMLInputElement;
    await fireEvent.input(locationInput, {
      target: { value: "The east crossing" },
    });
    await fireEvent.click(screen.getByText("Save correction"));

    await waitFor(() => expect(m.submitCorrection).toHaveBeenCalledTimes(1));
    const patch = m.submitCorrection.mock.calls[0][0];
    expect(patch.location.text).toBe("The east crossing");
    expect(patch.situation).toBeUndefined();
  });

  it("shows a clear message on a stale-revision conflict", async () => {
    const m = manager({
      submitCorrection: vi.fn(async () => "stale-revision"),
    });
    render(AdventureCorrectionForm, { manager: m });

    await fireEvent.click(
      screen.getByText("Fix something wrong with the current situation"),
    );
    await fireEvent.input(screen.getByLabelText("Location"), {
      target: { value: "The east crossing" },
    });
    await fireEvent.click(screen.getByText("Save correction"));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("changed");
    });
  });
});
