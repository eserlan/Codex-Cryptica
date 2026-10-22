/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import BiomeProfileEditor from "./BiomeProfileEditor.svelte";
import { makeStore } from "$lib/stores/biome-explorer.test-helpers";
import { getBiome } from "biome-engine";

const tundra = getBiome("tundra")!;

function setup() {
  const made = makeStore();
  made.store.startFromReference("tundra");
  render(BiomeProfileEditor, { props: { store: made.store } });
  return made;
}

describe("BiomeProfileEditor", () => {
  it("shows the reference values read-only beside the user's own fields", () => {
    setup();
    expect(
      screen.getAllByText(new RegExp(tundra.vegetation[0].text.slice(0, 30)))
        .length,
    ).toBeGreaterThan(0);
    const field = screen.getByLabelText(
      "Plants: my version",
    ) as HTMLTextAreaElement;
    expect(field.value).toBe("");
    expect(screen.getByText(/Based on Tundra/)).toBeTruthy();
  });

  it("marks an edited field as changed from the reference, in text", async () => {
    const { store } = setup();
    expect(screen.queryByText("Changed from reference")).toBeNull();
    await fireEvent.input(screen.getByLabelText("Plants: my version"), {
      target: { value: "Glowing moss" },
    });
    expect(store.draft?.profile.own.vegetation).toBe("Glowing moss");
    expect(screen.getByText("Changed from reference")).toBeTruthy();
  });

  it("lets a long value wrap inside its field rather than overflowing", () => {
    setup();
    const field = screen.getByLabelText(
      "Terrain: my version",
    ) as HTMLTextAreaElement;
    expect(field.getAttribute("maxlength")).toBe("4000");
    expect(field.className).toContain("break-words");
  });

  it("sets a climate range only when both numbers are given", async () => {
    const { store } = setup();
    await fireEvent.input(screen.getByLabelText("Temperature, lowest"), {
      target: { value: "5" },
    });
    expect(store.draft?.profile.own.climate.temperature).toBeUndefined();
    await fireEvent.input(screen.getByLabelText("Temperature, highest"), {
      target: { value: "15" },
    });
    expect(store.draft?.profile.own.climate.temperature).toEqual({
      low: 5,
      high: 15,
      unit: "°C",
    });
  });

  it("shows an error and writes nothing when saved without a name", async () => {
    const { vault } = setup();
    await fireEvent.click(screen.getByRole("button", { name: "Save biome" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/name/i);
    expect(vault.records.size).toBe(0);
  });

  it("asks before discarding unsaved changes and keeps them when declined", async () => {
    const { store } = setup();
    await fireEvent.input(screen.getByLabelText("Water: my version"), {
      target: { value: "Tidal pools" },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(store.draft?.profile.own.water).toBe("Tidal pools");

    await fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    await fireEvent.click(
      screen.getByRole("button", { name: "Discard changes" }),
    );
    expect(store.draft).toBeNull();
  });

  it("discards a clean draft without asking", async () => {
    const { store } = setup();
    await fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(store.draft).toBeNull();
  });

  it("copies the draft as Markdown, with the reference and my changes under separate headings", async () => {
    const { store, copied } = setup();
    store.setTitle("Ashen Flats");
    await fireEvent.input(screen.getByLabelText("Plants: my version"), {
      target: { value: "Glowing moss" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Copy as Markdown" }),
    );
    await waitFor(() => expect(copied).toHaveLength(1));
    expect(copied[0]).toContain("## Reference");
    expect(copied[0]).toContain("## My changes");
  });

  it("offers Make a copy only for a saved profile, and starts an unsaved copy", async () => {
    const { store } = setup();
    expect(screen.queryByRole("button", { name: "Make a copy" })).toBeNull();
    store.setTitle("Ashen Flats");
    await store.save();
    const copy = await screen.findByRole("button", { name: "Make a copy" });
    await fireEvent.click(copy);
    await waitFor(() => expect(store.draft?.entityId).toBeUndefined());
    expect(store.draft?.title).toBe("Ashen Flats (copy)");
  });

  it("explains a failed save and keeps what was typed", async () => {
    const { store, vault } = setup();
    store.setTitle("Ashen Flats");
    vault.failWrites = true;
    await fireEvent.click(screen.getByRole("button", { name: "Save biome" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /still here/,
    );
    expect(store.draft?.title).toBe("Ashen Flats");
  });

  it("moves focus into the discard dialog, closes it on Escape and returns focus", async () => {
    setup();
    await fireEvent.input(screen.getByLabelText("Water: my version"), {
      target: { value: "Tidal pools" },
    });
    const discard = screen.getByRole("button", { name: "Discard" });
    discard.focus();
    await fireEvent.click(discard);
    const keep = await screen.findByRole("button", { name: "Keep editing" });
    await waitFor(() => expect(document.activeElement).toBe(keep));
    await fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(document.activeElement).toBe(discard);
  });
});
