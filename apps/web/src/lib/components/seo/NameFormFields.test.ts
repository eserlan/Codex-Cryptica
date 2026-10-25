/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import NameFormFields from "./NameFormFields.svelte";

const base = {
  culture: "High Elf",
  gender: "Any",
  nameType: "Person",
  context: "",
};

describe("NameFormFields", () => {
  it("tucks presentation and context behind More options when collapsed", () => {
    const { container } = render(NameFormFields, {
      props: { ...base, collapseAdvanced: true },
    });
    const details = container.querySelector("details")!;

    expect(details.open).toBe(false);
    expect(details.querySelector("#name-context")).toBeTruthy();
    expect(details.querySelector("#culture-select")).toBeNull();
    expect(screen.getByRole("combobox", { name: "Name Type" })).toBeTruthy();
  });

  it("opens More options when campaign context is already filled", () => {
    const { container } = render(NameFormFields, {
      props: { ...base, context: "A desert empire", collapseAdvanced: true },
    });

    expect(container.querySelector("details")!.open).toBe(true);
  });

  it("shows every field inline by default", () => {
    const { container } = render(NameFormFields, { props: base });

    expect(container.querySelector("details")).toBeNull();
    expect(container.querySelector("#name-context")).toBeTruthy();
  });

  it("limits cultures to one genre when the page fixes it", () => {
    render(NameFormFields, {
      props: { ...base, fixedTheme: "Classic Fantasy" },
    });
    const options = Array.from(
      (
        screen.getByRole("combobox", {
          name: "Culture / Style",
        }) as HTMLSelectElement
      ).options,
    ).map((o) => o.value);

    expect(options).toContain("Dwarven");
    expect(options).not.toContain("Sailor's Nickname");
    expect(options).not.toContain("Dream Fragment");
    expect(
      screen.queryByRole("combobox", { name: "Choose a vibe" }),
    ).toBeNull();
  });
});
