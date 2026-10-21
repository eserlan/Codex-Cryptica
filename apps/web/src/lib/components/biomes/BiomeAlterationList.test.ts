/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import BiomeAlterationList from "./BiomeAlterationList.svelte";
import { makeStore } from "$lib/stores/biome-explorer.test-helpers";

const goodJson = JSON.stringify({
  suggestions: [
    { effect: "Rivers run grey", plausibilityNote: "Ash clouds water." },
    { effect: "Ferns spread", plausibilityNote: "Ash enriches soil." },
  ],
});

function setup(overrides = {}) {
  const made = makeStore(overrides);
  made.store.startFromReference("tundra");
  render(BiomeAlterationList, { props: { store: made.store } });
  return made;
}

async function addOne(description = "It rains ash") {
  await fireEvent.input(screen.getByLabelText("What is different?"), {
    target: { value: description },
  });
  await fireEvent.click(
    screen.getByRole("button", { name: "Add fictional change" }),
  );
}

describe("BiomeAlterationList", () => {
  it("adds a change, flags it as fictional in text and asks for a cause", async () => {
    const { store } = setup();
    await addOne();
    expect(store.draft?.profile.alterations).toHaveLength(1);
    expect(screen.getByText("Fictional")).toBeTruthy();
    expect(screen.getByLabelText("Why does this happen?")).toBeTruthy();
    expect(screen.getByText(/Say what causes this change/)).toBeTruthy();
  });

  it("does not add an empty change", async () => {
    const { store } = setup();
    await fireEvent.click(
      screen.getByRole("button", { name: "Add fictional change" }),
    );
    expect(store.draft?.profile.alterations).toEqual([]);
    expect(screen.getByRole("alert").textContent).toMatch(
      /Describe what is different/,
    );
  });

  it("clears the reminder once a cause is written", async () => {
    const { store } = setup();
    await addOne();
    await fireEvent.input(screen.getByLabelText("Why does this happen?"), {
      target: { value: "A sleeping volcano" },
    });
    expect(screen.queryByText(/Say what causes this change/)).toBeNull();
    expect(store.draft?.profile.alterations[0].cause).toBe(
      "A sleeping volcano",
    );
  });

  it("lets the user add and remove their own effects", async () => {
    const { store } = setup();
    await addOne();
    await fireEvent.input(screen.getByLabelText("Add an effect"), {
      target: { value: "Grey rivers" },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Add effect" }));
    expect(store.draft?.profile.alterations[0].effects).toEqual([
      "Grey rivers",
    ]);
    await fireEvent.click(
      screen.getByRole("button", { name: "Remove effect: Grey rivers" }),
    );
    expect(store.draft?.profile.alterations[0].effects).toEqual([]);
  });

  it("removes a change", async () => {
    const { store } = setup();
    await addOne();
    await fireEvent.click(
      screen.getByRole("button", { name: "Remove fictional change" }),
    );
    expect(store.draft?.profile.alterations).toEqual([]);
  });

  it("explains that suggestions are off, instead of showing the button, when AI is unavailable", async () => {
    setup();
    await addOne();
    expect(
      screen.queryByRole("button", { name: "Suggest effects" }),
    ).toBeNull();
    expect(screen.getByText(/AI helper is off/)).toBeTruthy();
  });

  it("shows a first-use note about the AI helper once, and remembers it", async () => {
    const { store } = setup({ suggest: async () => goodJson });
    await addOne();
    expect(
      screen.getByText(/sends this change and a short summary/i),
    ).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(
      screen.queryByText(/sends this change and a short summary/i),
    ).toBeNull();
    expect(store.aiNoticeSeen).toBe(true);
  });

  it("shows proposals with Add and Dismiss and changes nothing until Add is pressed", async () => {
    const { store } = setup({ suggest: async () => goodJson });
    await addOne();
    await fireEvent.click(
      screen.getByRole("button", { name: "Suggest effects" }),
    );
    expect(await screen.findByText("Rivers run grey")).toBeTruthy();
    expect(store.draft?.profile.alterations[0].effects).toEqual([]);

    await fireEvent.click(
      screen.getAllByRole("button", { name: /^Add suggestion/ })[0],
    );
    expect(store.draft?.profile.alterations[0].effects).toEqual([
      "Rivers run grey",
    ]);
    expect(screen.getByText("Suggested by AI")).toBeTruthy();

    await fireEvent.click(
      screen.getByRole("button", { name: /^Dismiss suggestion/ }),
    );
    await waitFor(() => expect(screen.queryByText("Ferns spread")).toBeNull());
    expect(store.draft?.profile.alterations[0].effects).toEqual([
      "Rivers run grey",
    ]);
  });

  it("announces suggestions in a polite live region and explains a failure", async () => {
    setup({
      suggest: async () => {
        throw new Error("offline");
      },
    });
    await addOne();
    await fireEvent.click(
      screen.getByRole("button", { name: "Suggest effects" }),
    );
    const live = await screen.findByTestId("biome-suggestion-status");
    expect(live.getAttribute("aria-live")).toBe("polite");
    await waitFor(() =>
      expect(live.textContent).toMatch(/isn't available right now/),
    );
  });
});
