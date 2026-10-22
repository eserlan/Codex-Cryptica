/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import BiomeProfileList from "./BiomeProfileList.svelte";
import { makeStore } from "$lib/stores/biome-explorer.test-helpers";

async function withProfiles(count = 2) {
  const made = makeStore();
  for (let i = 0; i < count; i++) {
    made.store.startFromReference("tundra");
    made.store.setTitle("Twin");
    await made.store.save();
    made.store.discardDraft(true);
  }
  await made.store.refreshProfiles();
  return made;
}

describe("BiomeProfileList", () => {
  it("shows an empty state that points back to the library", async () => {
    const { store } = makeStore();
    render(BiomeProfileList, { props: { store } });
    expect(screen.getByText(/You haven't saved any biomes yet/)).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Browse biomes" }),
    );
    expect(store.view).toBe("library");
  });

  it("lists saved profiles with the reference name so same-named ones can be told apart", async () => {
    const { store } = await withProfiles(2);
    render(BiomeProfileList, { props: { store } });
    expect(screen.getAllByText("Twin")).toHaveLength(2);
    expect(screen.getAllByText(/Based on Tundra/)).toHaveLength(2);
  });

  it("opens a profile in the editor", async () => {
    const { store } = await withProfiles(1);
    render(BiomeProfileList, { props: { store } });
    await fireEvent.click(screen.getByRole("button", { name: "Open Twin" }));
    await waitFor(() => expect(store.view).toBe("editor"));
    expect(store.draft?.title).toBe("Twin");
  });

  it("makes a copy as a new draft", async () => {
    const { store } = await withProfiles(1);
    render(BiomeProfileList, { props: { store } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Make a copy of Twin" }),
    );
    await waitFor(() => expect(store.draft?.title).toBe("Twin (copy)"));
    expect(store.draft?.entityId).toBeUndefined();
  });

  it("asks before deleting, keeps the profile when declined, and deletes when confirmed", async () => {
    const { store, vault } = await withProfiles(1);
    render(BiomeProfileList, { props: { store } });
    await fireEvent.click(screen.getByRole("button", { name: "Delete Twin" }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(vault.records.size).toBe(1);

    await fireEvent.click(screen.getByRole("button", { name: "Delete Twin" }));
    await fireEvent.click(screen.getByRole("button", { name: "Delete biome" }));
    await screen.findByText(/You haven't saved any biomes yet/);
    expect(vault.records.size).toBe(0);
  });

  it("says plainly when a profile can't be opened", async () => {
    const { store, vault } = await withProfiles(1);
    const id = [...vault.records.keys()][0];
    render(BiomeProfileList, { props: { store } });
    vault.records.delete(id);
    await fireEvent.click(screen.getByRole("button", { name: "Open Twin" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /couldn't open/i,
    );
  });

  it("exports a saved profile as Markdown", async () => {
    const { store, copied } = await withProfiles(1);
    render(BiomeProfileList, { props: { store } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Copy Twin as Markdown" }),
    );
    await waitFor(() =>
      expect(copied.some((text) => text.startsWith("# Twin"))).toBe(true),
    );
  });

  it("focuses the safe choice in the delete dialog and closes on Escape", async () => {
    const { store } = await withProfiles(1);
    render(BiomeProfileList, { props: { store } });
    const del = screen.getByRole("button", { name: "Delete Twin" });
    del.focus();
    await fireEvent.click(del);
    const keep = await screen.findByRole("button", { name: "Keep it" });
    await waitFor(() => expect(document.activeElement).toBe(keep));
    await fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(store.deletePendingId).toBeNull();
  });
});
