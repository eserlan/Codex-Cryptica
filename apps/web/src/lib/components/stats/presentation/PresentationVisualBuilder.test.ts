/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import PresentationVisualBuilder from "./PresentationVisualBuilder.svelte";

const schema = {
  id: "s",
  name: "Sheet",
  isBuiltIn: false,
  fields: [
    { id: "hp", key: "health", label: "Health", type: "counter" as const },
    { id: "h", label: "Heading", type: "heading" as const },
  ],
};

describe("PresentationVisualBuilder", () => {
  it("opens field options by keyboard and retains saved overrides on another edit", async () => {
    render(PresentationVisualBuilder, {
      schema,
      source: "{{stat.health hide-label}}",
    });
    const chip = screen.getByLabelText("Health field options");
    await fireEvent.keyDown(chip, { key: "F10", shiftKey: true });
    await fireEvent.click(
      screen.getByRole("menuitem", { name: "Progress Bar" }),
    );
    expect(screen.getByText("progress")).toBeTruthy();
    expect(screen.getByText("no-lbl")).toBeTruthy();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("ignores unrelated keyboard keys and keeps the builder hidden in code mode", async () => {
    const { rerender } = render(PresentationVisualBuilder, {
      schema,
      source: "[health]",
    });
    await fireEvent.keyDown(screen.getByLabelText("Health field options"), {
      key: "Enter",
    });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByText("[h]")).toBeNull();
    await rerender({ active: false });
    expect(
      screen.queryByTestId("presentation-editor-visual-builder"),
    ).toBeNull();
  });
});

describe("visual builder drag and drop", () => {
  it("moves palette fields into a row and moves chips between rows", async () => {
    render(PresentationVisualBuilder, {
      schema,
      source: ":::card\n### Main\n:::",
      active: true,
    });
    const palette = screen.getByText("[hp]").closest('[role="button"]')!;
    await fireEvent.dragStart(palette);
    await fireEvent.drop(screen.getByRole("list"));
    expect(screen.getByLabelText("Health field options")).toBeTruthy();
    await fireEvent.click(screen.getByText("+ Add Row to Card"));
    await fireEvent.dragStart(screen.getByLabelText("Health field options"));
    await fireEvent.drop(screen.getAllByRole("list")[1]);
    expect(
      screen
        .getAllByRole("list")[0]
        .querySelector('[aria-label="Health field options"]'),
    ).toBeNull();
    expect(
      screen
        .getAllByRole("list")[1]
        .querySelector('[aria-label="Health field options"]'),
    ).toBeTruthy();
  });

  it("ignores a drop without an active drag", async () => {
    render(PresentationVisualBuilder, { schema, source: "[hp]" });
    await fireEvent.drop(screen.getByRole("list"));
    expect(screen.getAllByLabelText("Health field options")).toHaveLength(1);
  });
});
