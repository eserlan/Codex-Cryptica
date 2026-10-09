/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HelpQuickPrompts from "./HelpQuickPrompts.svelte";

const prompts = [
  "Where do I add a connection?",
  "How do I give a connection a label like rival?",
];

describe("HelpQuickPrompts", () => {
  it("lists the prompts as buttons in a labelled list", () => {
    render(HelpQuickPrompts, { prompts, onAsk: vi.fn() });

    const list = screen.getByRole("list", {
      name: "Questions you can ask Cif",
    });
    expect(list.querySelectorAll("li").length).toBe(2);
    for (const prompt of prompts) {
      expect(screen.getByRole("button", { name: prompt })).toBeTruthy();
    }
  });

  it("asks exactly the text of the prompt that was tapped", async () => {
    const onAsk = vi.fn();
    render(HelpQuickPrompts, { prompts, onAsk });

    await fireEvent.click(
      screen.getByRole("button", {
        name: "How do I give a connection a label like rival?",
      }),
    );

    expect(onAsk).toHaveBeenCalledTimes(1);
    expect(onAsk).toHaveBeenCalledWith(
      "How do I give a connection a label like rival?",
    );
  });

  it("makes every prompt a comfortable touch target", () => {
    render(HelpQuickPrompts, { prompts, onAsk: vi.fn() });

    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain("touch-target");
    }
  });

  it("renders nothing, not even the heading, when there are no prompts", () => {
    const { container } = render(HelpQuickPrompts, {
      prompts: [],
      onAsk: vi.fn(),
    });

    expect(screen.queryByText("Questions you can ask Cif")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it("never asks anything until a prompt is tapped", () => {
    const onAsk = vi.fn();
    render(HelpQuickPrompts, { prompts, onAsk });

    expect(onAsk).not.toHaveBeenCalled();
  });
});
