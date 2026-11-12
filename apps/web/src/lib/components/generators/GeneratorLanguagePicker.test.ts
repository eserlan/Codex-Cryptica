/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import GeneratorLanguagePicker from "./GeneratorLanguagePicker.svelte";

const languages = [
  { id: "old", title: "Old Tongue", legacy: true, structured: false },
];

describe("GeneratorLanguagePicker", () => {
  it("requires a choice before applying a suggestion and updates the guidance", async () => {
    const { rerender } = render(GeneratorLanguagePicker, {
      supportsPrimaryLanguage: true,
      languages,
      suggestedLanguageId: "old",
    });
    const select = screen.getByLabelText(
      "Naming language",
    ) as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(
      screen.getByText(/Suggested from the source relationship: Old Tongue/),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Old Tongue (legacy notes)" }),
    ).toBeTruthy();
    await fireEvent.change(select, { target: { value: "old" } });
    expect(screen.getByText(/Only this language supplies/)).toBeTruthy();
    await rerender({ primaryLanguageId: "", suggestedLanguageId: undefined });
    expect(
      screen.getByText("No saved language rules will be applied."),
    ).toBeTruthy();
  });

  it("hides unsupported and empty language lists, and honours disabled state", async () => {
    const { rerender } = render(GeneratorLanguagePicker, {
      supportsPrimaryLanguage: false,
      languages,
    });
    expect(screen.queryByRole("combobox")).toBeNull();
    await rerender({ supportsPrimaryLanguage: true, languages: [] });
    expect(screen.queryByRole("combobox")).toBeNull();
    await rerender({ languages, disabled: true });
    expect((screen.getByRole("combobox") as HTMLSelectElement).disabled).toBe(
      true,
    );
  });
});
