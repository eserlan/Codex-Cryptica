/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import SelectWithCustomOption from "./SelectWithCustomOption.svelte";

describe("SelectWithCustomOption", () => {
  const choices = [
    { value: "Human", label: "Human" },
    { value: "Elf", label: "Elf" },
  ];

  it("reveals a text input when the user picks Own option", async () => {
    render(SelectWithCustomOption, {
      props: {
        id: "ancestry",
        label: "Ancestry",
        value: "Human",
        choices,
      },
    });

    const select = screen.getByLabelText("Ancestry");
    await fireEvent.change(select, { target: { value: "__custom__" } });

    expect(screen.getByLabelText("Ancestry (Own option)")).toBeTruthy();
  });

  it("uses the typed custom value and hides the input again when switching back", async () => {
    render(SelectWithCustomOption, {
      props: {
        id: "ancestry",
        label: "Ancestry",
        value: "Human",
        choices,
      },
    });

    const select = screen.getByLabelText("Ancestry") as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "__custom__" } });

    const customInput = screen.getByLabelText(
      "Ancestry (Own option)",
    ) as HTMLInputElement;
    await fireEvent.input(customInput, {
      target: { value: "Clockwork pilgrim" },
    });

    expect(customInput.value).toBe("Clockwork pilgrim");

    await fireEvent.change(select, { target: { value: "Elf" } });

    expect(screen.queryByLabelText("Ancestry (Own option)")).toBeNull();
    expect(select.value).toBe("Elf");
  });
});
