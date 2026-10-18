/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HexNotes from "./HexNotes.svelte";

describe("HexNotes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves GM notes after a pause, separately from AI notes", async () => {
    const onSaveNotes = vi.fn();
    const onSaveAiNotes = vi.fn();
    render(HexNotes, {
      notes: "",
      aiNotes: "",
      onSaveNotes,
      onSaveAiNotes,
    });

    await fireEvent.input(screen.getByLabelText("Your notes"), {
      target: { value: "The bridge is out" },
    });
    expect(onSaveNotes).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    expect(onSaveNotes).toHaveBeenCalledWith("The bridge is out");
    expect(onSaveAiNotes).not.toHaveBeenCalled();
  });

  it("hides the AI-drafted section when there are no AI notes", () => {
    render(HexNotes, {
      notes: "Mine",
      aiNotes: "",
      onSaveNotes: vi.fn(),
      onSaveAiNotes: vi.fn(),
    });

    expect(screen.queryByText("AI-drafted")).toBeNull();
  });

  it("shows AI notes in their own framed section and clears them on request", async () => {
    const onSaveAiNotes = vi.fn();
    render(HexNotes, {
      notes: "Mine",
      aiNotes: "Hazard: rotten boards",
      onSaveNotes: vi.fn(),
      onSaveAiNotes,
    });

    expect(screen.getByText("AI-drafted")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Clear AI notes" }),
    );
    expect(onSaveAiNotes).toHaveBeenCalledWith("");
  });

  it("caps GM notes at 20,000 characters", () => {
    render(HexNotes, {
      notes: "",
      aiNotes: "",
      onSaveNotes: vi.fn(),
      onSaveAiNotes: vi.fn(),
    });

    expect(
      (screen.getByLabelText("Your notes") as HTMLTextAreaElement).maxLength,
    ).toBe(20_000);
  });
});
