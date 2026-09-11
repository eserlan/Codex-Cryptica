/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TemporalPickerFooter from "./TemporalPickerFooter.svelte";

describe("TemporalPickerFooter", () => {
  it("applies when enabled", async () => {
    const onApply = vi.fn();
    render(TemporalPickerFooter, { onCancel: vi.fn(), onApply });
    await fireEvent.click(screen.getByTestId("apply-date-button"));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it("prevents applying when disabled", async () => {
    const onApply = vi.fn();
    render(TemporalPickerFooter, {
      isDisabled: true,
      onCancel: vi.fn(),
      onApply,
    });
    await fireEvent.click(screen.getByTestId("apply-date-button"));
    expect(onApply).not.toHaveBeenCalled();
  });
});
