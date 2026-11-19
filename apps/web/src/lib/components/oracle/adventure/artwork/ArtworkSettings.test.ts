import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { ArtworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
import ArtworkSettings from "./ArtworkSettings.svelte";

describe("adventure illustration settings", () => {
  it("changes the device preference through a labelled control", async () => {
    const preferences = new ArtworkPreferences(null);
    render(ArtworkSettings, { props: { preferences } });
    const control = screen.getByRole("checkbox", {
      name: "Show adventure illustrations",
    }) as HTMLInputElement;
    expect(control.checked).toBe(true);
    await fireEvent.click(control);
    expect(preferences.enabled).toBe(false);
    await fireEvent.click(control);
    expect(preferences.enabled).toBe(true);
  });
  it("reflects a preference changed elsewhere", async () => {
    const preferences = new ArtworkPreferences(null);
    preferences.setEnabled(false);
    render(ArtworkSettings, { props: { preferences } });
    const control = screen.getByRole("checkbox", {
      name: "Show adventure illustrations",
    }) as HTMLInputElement;
    expect(control.checked).toBe(false);
  });
});
