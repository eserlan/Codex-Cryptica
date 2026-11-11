/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import GeneratorRunControls from "./GeneratorRunControls.svelte";

describe("GeneratorRunControls", () => {
  it("edits instructions and lets users opt out of available AI", async () => {
    render(GeneratorRunControls, { aiAvailable: true });
    const instructions = screen.getByLabelText(
      /Instructions/,
    ) as HTMLTextAreaElement;
    await fireEvent.input(instructions, { target: { value: "Keep it short" } });
    expect(instructions.value).toBe("Keep it short");
    const toggle = screen.getByRole("checkbox") as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    await fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
    expect(screen.queryByTestId("ai-unavailable-notice")).toBeNull();
  });

  it("explains unavailable AI and only warns about ToV mechanics when selected", async () => {
    const { rerender } = render(GeneratorRunControls, {
      aiAvailable: false,
      aiPolicy: { isEnabled: false, isAvailable: true },
      gameSystem: "tales-of-the-valiant",
    });
    expect(screen.getByTestId("ai-unavailable-notice").textContent).toContain(
      "AI generation is disabled",
    );
    expect(screen.getByTestId("tov-offline-notice")).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
    await rerender({
      aiPolicy: { isEnabled: true, isAvailable: false },
      gameSystem: "system-neutral",
    });
    expect(screen.getByTestId("ai-unavailable-notice").textContent).toContain(
      "requires an account",
    );
    expect(screen.queryByTestId("tov-offline-notice")).toBeNull();
    await rerender({ aiPolicy: undefined });
    expect(screen.queryByTestId("ai-unavailable-notice")).toBeNull();
  });

  it("disables the editable controls", () => {
    render(GeneratorRunControls, { aiAvailable: true, disabled: true });
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).disabled).toBe(
      true,
    );
  });
});
