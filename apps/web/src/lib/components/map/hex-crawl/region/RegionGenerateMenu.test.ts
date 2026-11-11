/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import RegionGenerateMenu from "./RegionGenerateMenu.svelte";
import {
  CENTRE,
  MAP_ID,
  memoryStorage,
  setupRegion,
} from "./region-test-helpers";

describe("RegionGenerateMenu", () => {
  it.each([
    [/Grow from this hex/, "grow"],
    [/Generate area/, "area"],
    [/Regenerate generated terrain/, "regenerate"],
  ])("%s starts a %s preview", async (name, operation) => {
    const { store } = setupRegion();
    render(RegionGenerateMenu, {
      store,
      mapId: MAP_ID,
      hex: CENTRE,
      storage: memoryStorage(),
    });
    await fireEvent.click(screen.getByRole("button", { name }));
    if (operation === "regenerate") {
      // Nothing generated yet, so there is nothing to regenerate.
      expect(store.review).toBeNull();
      expect(store.message).toMatchObject({ reason: "nothing-to-generate" });
    } else {
      expect(store.review?.operation).toBe(operation);
    }
  });

  it("Fill gaps reports that an empty map has no gaps", async () => {
    const { store } = setupRegion();
    render(RegionGenerateMenu, {
      store,
      mapId: MAP_ID,
      hex: CENTRE,
      storage: memoryStorage(),
    });
    await fireEvent.click(screen.getByRole("button", { name: /Fill gaps/ }));
    expect(store.review).toBeNull();
    expect(store.message).toMatchObject({ reason: "nothing-to-generate" });
  });

  it("shows the hint once and remembers that it was dismissed", async () => {
    const { store } = setupRegion();
    const storage = memoryStorage();
    const first = render(RegionGenerateMenu, {
      store,
      mapId: MAP_ID,
      hex: CENTRE,
      storage,
    });
    expect(screen.getByTestId("region-hint")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Dismiss hint" }));
    expect(screen.queryByTestId("region-hint")).toBeNull();
    first.unmount();
    render(RegionGenerateMenu, { store, mapId: MAP_ID, hex: CENTRE, storage });
    expect(screen.queryByTestId("region-hint")).toBeNull();
  });

  it("still works when storage throws", () => {
    const { store } = setupRegion();
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    };
    render(RegionGenerateMenu, { store, mapId: MAP_ID, hex: CENTRE, storage });
    expect(screen.getByTestId("region-hint")).toBeTruthy();
  });
});
