/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SpatialImageDetails from "./SpatialImageDetails.svelte";

describe("SpatialImageDetails", () => {
  it("edits tile details through its shared callback", async () => {
    const onChange = vi.fn();
    render(SpatialImageDetails, {
      props: {
        details: { description: "", encounter: "", contents: "", notes: "" },
        onChange,
      },
    });
    await fireEvent.input(screen.getByLabelText("Description"), {
      target: { value: "A cold crypt" },
    });
    expect(onChange).toHaveBeenCalledWith({ description: "A cold crypt" });
  });

  it("prevents edits when read-only", () => {
    render(SpatialImageDetails, {
      props: {
        details: { description: "", encounter: "", contents: "", notes: "" },
        onChange: vi.fn(),
        disabled: true,
      },
    });
    expect(screen.getByLabelText("Notes").hasAttribute("disabled")).toBe(true);
  });
});
