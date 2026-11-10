/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { DEFAULT_CALENDAR } from "chronology-engine";
import { describe, expect, it, vi } from "vitest";
import WorldEntrySetup from "./WorldEntrySetup.svelte";
import { emptyWorldEntrySetup } from "#lib/services/adventure/world-entry-setup.js";

describe("WorldEntrySetup component", () => {
  it("renders Vault pickers when characters and locations are available", () => {
    const setup = emptyWorldEntrySetup("vault-1");
    const onContinue = vi.fn();
    render(WorldEntrySetup, {
      props: {
        setup,
        characters: [{ id: "pc-1", name: "Lira" }],
        locations: [{ id: "loc-1", name: "Northbrook" }],
        calendar: DEFAULT_CALENDAR,
        onContinue,
      },
    });

    expect(screen.getByTestId("world-entry-character")).toBeTruthy();
    expect(screen.getByTestId("world-entry-location")).toBeTruthy();
    expect(screen.getByText("Lira")).toBeTruthy();
    expect(screen.getByText("Northbrook")).toBeTruthy();
  });

  it("displays graceful helper copy and provisional inputs for a minimal empty Vault", async () => {
    const setup = emptyWorldEntrySetup("vault-empty");
    const onContinue = vi.fn();
    render(WorldEntrySetup, {
      props: {
        setup,
        characters: [],
        locations: [],
        calendar: DEFAULT_CALENDAR,
        onContinue,
      },
    });

    expect(screen.queryByTestId("world-entry-character")).toBeNull();
    expect(screen.queryByTestId("world-entry-location")).toBeNull();
    expect(
      screen.getByText(/No saved characters in this Vault yet/),
    ).toBeTruthy();
    expect(
      screen.getByText(/No saved locations in this Vault yet/),
    ).toBeTruthy();

    const charInput = screen.getByTestId("world-entry-new-character");
    const locInput = screen.getByTestId("world-entry-new-location");
    expect(charInput).toBeTruthy();
    expect(locInput).toBeTruthy();

    await fireEvent.input(charInput, { target: { value: "Mara" } });
    await fireEvent.input(locInput, { target: { value: "Wayfarer Inn" } });
    await fireEvent.click(screen.getByTestId("world-entry-continue"));

    expect(onContinue).toHaveBeenCalledOnce();
    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        provisionalCharacterName: "Mara",
        provisionalLocationName: "Wayfarer Inn",
        intent: "explore",
      }),
    );
  });

  it("displays validation errors when continuing with missing fields", async () => {
    const setup = emptyWorldEntrySetup("vault-1");
    const onContinue = vi.fn();
    render(WorldEntrySetup, {
      props: {
        setup,
        characters: [{ id: "pc-1", name: "Lira" }],
        locations: [{ id: "loc-1", name: "Northbrook" }],
        calendar: DEFAULT_CALENDAR,
        onContinue,
      },
    });

    await fireEvent.click(screen.getByTestId("world-entry-continue"));
    expect(onContinue).not.toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(
      "Choose a character or provide a character name.",
    );
    expect(alert.textContent).toContain(
      "Choose a location or name a starting place.",
    );
  });
});
