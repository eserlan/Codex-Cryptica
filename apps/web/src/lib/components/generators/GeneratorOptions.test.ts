/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import GeneratorOptions from "./GeneratorOptions.svelte";

describe("GeneratorOptions", () => {
  it("renders conditional world choices and forwards custom select changes", async () => {
    const onvaluechange = vi.fn();
    const { rerender } = render(GeneratorOptions, {
      generatorId: "world",
      themeId: "fantasy",
      optionValues: { genre: "Lancer" },
      onvaluechange,
    });
    expect(screen.getByLabelText("Lancer World Frame")).toBeTruthy();
    expect(screen.queryByLabelText("Primary Societal Model")).toBeNull();
    await rerender({ optionValues: { genre: "Classic Fantasy" } });
    const pressure = screen.getByLabelText("Campaign Pressure");
    await fireEvent.change(pressure, { target: { value: "__custom__" } });
    await fireEvent.input(
      screen.getByLabelText("Campaign Pressure (Own option)"),
      { target: { value: "My pressure" } },
    );
    expect(onvaluechange).toHaveBeenLastCalledWith(
      "campaignPressure",
      "My pressure",
    );
  });

  it("forwards numeric values and an empty number without coercing it to zero", async () => {
    const onvaluechange = vi.fn();
    render(GeneratorOptions, {
      generatorId: "encounter",
      optionValues: { gameSystem: "tales-of-the-valiant" },
      onvaluechange,
    });
    const size = screen.getByLabelText("Party Size");
    await fireEvent.input(size, { target: { value: "6" } });
    expect(onvaluechange).toHaveBeenLastCalledWith("partySize", 6);
    await fireEvent.input(size, { target: { value: "" } });
    expect(onvaluechange).toHaveBeenLastCalledWith("partySize", "");
  });

  it("forwards text and checkbox edits, including unchecking", async () => {
    const onvaluechange = vi.fn();
    render(GeneratorOptions, {
      generatorId: "business",
      optionValues: {},
      onvaluechange,
    });
    await fireEvent.input(screen.getByLabelText("Business type"), {
      target: { value: "Bookshop" },
    });
    expect(onvaluechange).toHaveBeenLastCalledWith("businessType", "Bookshop");
    const owns = screen.getByLabelText("Players own this business");
    await fireEvent.click(owns);
    expect(onvaluechange).toHaveBeenLastCalledWith("playersOwn", true);
    await fireEvent.click(owns);
    expect(onvaluechange).toHaveBeenLastCalledWith("playersOwn", false);
  });

  it("forwards textarea edits", async () => {
    const onvaluechange = vi.fn();
    render(GeneratorOptions, {
      generatorId: "adventure",
      optionValues: {},
      onvaluechange,
    });
    await fireEvent.input(screen.getByLabelText("Starting Seed / Situation"), {
      target: { value: "A missing ship" },
    });
    expect(onvaluechange).toHaveBeenLastCalledWith("seed", "A missing ship");
  });

  it("disables every option control", () => {
    render(GeneratorOptions, {
      generatorId: "npc",
      optionValues: {},
      onvaluechange: vi.fn(),
      disabled: true,
    });
    for (const input of screen.getAllByRole("combobox") as HTMLSelectElement[])
      expect(input.disabled).toBe(true);
  });
});
