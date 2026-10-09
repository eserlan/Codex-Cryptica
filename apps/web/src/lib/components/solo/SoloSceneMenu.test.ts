/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  scenes: [
    { name: "Arrival", sectionId: "s1" },
    { name: "The crypt", sectionId: "s2" },
  ] as { name: string; sectionId: string | null }[],
  sceneName: "The crypt",
  returnToScene: vi.fn(async (_i: number) => true),
  setScene: vi.fn(async (_n: string) => true),
  renameScene: vi.fn(async (_n: string) => true),
  openJournal: vi.fn(),
}));
vi.mock("$lib/stores/solo-session-instance", () => ({
  soloSessionStore: {
    get scenes() {
      return env.scenes;
    },
    get session() {
      return { sceneName: env.sceneName, sceneSectionId: null };
    },
    returnToScene: env.returnToScene,
    setScene: env.setScene,
    renameScene: env.renameScene,
  },
}));
vi.mock("$lib/stores/quicknote.svelte", () => ({
  quickNoteStore: { openJournal: env.openJournal },
}));

import SoloSceneMenu from "./SoloSceneMenu.svelte";

beforeEach(() => {
  env.returnToScene.mockClear();
  env.openJournal.mockClear();
});

async function openMenu() {
  await fireEvent.click(screen.getByTestId("solo-scene-menu"));
}

describe("SoloSceneMenu", () => {
  it("lists the scenes in order and marks the current one", async () => {
    render(SoloSceneMenu);
    await openMenu();
    const items = screen.getAllByTestId("solo-scene-item");
    expect(items.map((i) => i.textContent?.trim())).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Arrival"),
        expect.stringContaining("The crypt"),
      ]),
    );
    expect(items[1].getAttribute("aria-current")).toBe("true");
    expect(items[0].getAttribute("aria-current")).toBeNull();
  });

  it("Open shows that scene's section in the journal", async () => {
    render(SoloSceneMenu);
    await openMenu();
    await fireEvent.click(
      screen.getAllByRole("menuitem", { name: /^Open/ })[0],
    );
    expect(env.openJournal).toHaveBeenCalledWith({ sectionId: "s1" });
  });

  it("Return to scene starts a new visit to that scene", async () => {
    render(SoloSceneMenu);
    await openMenu();
    await fireEvent.click(
      screen.getAllByRole("menuitem", { name: /Return to scene/ })[0],
    );
    expect(env.returnToScene).toHaveBeenCalledWith(0);
  });

  it("keeps the scene name field, so a scene can still be renamed or started", async () => {
    render(SoloSceneMenu);
    await openMenu();
    expect(screen.getByTestId("solo-scene")).toBeTruthy();
  });
});
