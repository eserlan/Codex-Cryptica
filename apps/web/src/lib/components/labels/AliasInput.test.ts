/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import AliasInput from "./AliasInput.svelte";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

describe("AliasInput", () => {
  it("renders existing aliases", () => {
    const aliases = ["Shadow", "Ghost"];
    render(AliasInput, { aliases });

    expect(screen.getByText("Shadow")).toBeDefined();
    expect(screen.getByText("Ghost")).toBeDefined();
  });

  it("adds an alias on Enter", async () => {
    const aliases: string[] = [];
    // Using a wrapper component is needed for testing $bindable in Svelte 5 with RTL
    // but we can also just check if the local state changes and if we can mock the event.
    // For simplicity, we'll verify the UI updates.

    render(AliasInput, { aliases });

    const input = screen.getByPlaceholderText("Add alias...");
    await fireEvent.input(input, { target: { value: "New Alias" } });
    await fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("New Alias")).toBeDefined();
  });

  it("adds an alias on comma", async () => {
    render(AliasInput, { aliases: [] });

    const input = screen.getByPlaceholderText("Add alias...");
    await fireEvent.input(input, { target: { value: "Comma Alias" } });
    await fireEvent.keyDown(input, { key: "," });

    expect(screen.getByText("Comma Alias")).toBeDefined();
  });

  it("removes an alias when clicking X", async () => {
    render(AliasInput, { aliases: ["ToDelete"] });

    const removeButton = screen.getByLabelText("Remove alias ToDelete");
    await fireEvent.click(removeButton);

    expect(screen.queryByText("ToDelete")).toBeNull();
  });

  it("removes last alias on Backspace when input is empty", async () => {
    render(AliasInput, { aliases: ["Keep", "Last"] });

    const input = screen.getByPlaceholderText("Add alias...");
    await fireEvent.keyDown(input, { key: "Backspace" });

    expect(screen.queryByText("Last")).toBeNull();
    expect(screen.getByText("Keep")).toBeDefined();
  });
});
