/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  store: {
    session: { sceneName: "" as string, sceneSectionId: null as string | null },
    setScene: vi.fn(async (_name: string) => true),
    renameScene: vi.fn(async (_name: string) => true),
  },
}));
vi.mock("$lib/stores/solo-session-instance", () => ({
  soloSessionStore: env.store,
}));

import SoloSceneField from "./SoloSceneField.svelte";

beforeEach(() => {
  env.store.session = { sceneName: "", sceneSectionId: null };
  env.store.setScene.mockClear();
  env.store.renameScene.mockClear();
});

describe("SoloSceneField", () => {
  it("shows a placeholder when no scene is named", () => {
    render(SoloSceneField);
    const field = screen.getByTestId("solo-scene") as HTMLInputElement;
    expect(field.value).toBe("");
    expect(field.placeholder).toBe("Name this scene");
  });

  it("shows the current scene name", () => {
    env.store.session = { sceneName: "Arrival", sceneSectionId: "sec1" };
    render(SoloSceneField);
    expect((screen.getByTestId("solo-scene") as HTMLInputElement).value).toBe(
      "Arrival",
    );
  });

  it("starts a new scene when none is named", async () => {
    render(SoloSceneField);
    const field = screen.getByTestId("solo-scene");
    await fireEvent.input(field, { target: { value: "Arrival" } });
    await fireEvent.click(screen.getByTestId("solo-scene-new"));
    await waitFor(() =>
      expect(env.store.setScene).toHaveBeenCalledWith("Arrival"),
    );
    expect(env.store.renameScene).not.toHaveBeenCalled();
  });

  it("renames the current scene when one is named", async () => {
    env.store.session = { sceneName: "Arrival", sceneSectionId: "sec1" };
    render(SoloSceneField);
    const field = screen.getByTestId("solo-scene");
    await fireEvent.input(field, { target: { value: "The flooded crypt" } });
    await fireEvent.click(screen.getByTestId("solo-scene-rename"));
    await waitFor(() =>
      expect(env.store.renameScene).toHaveBeenCalledWith("The flooded crypt"),
    );
    expect(env.store.setScene).not.toHaveBeenCalled();
  });

  it("confirms with Enter, renaming when a scene exists", async () => {
    env.store.session = { sceneName: "Arrival", sceneSectionId: "sec1" };
    render(SoloSceneField);
    const field = screen.getByTestId("solo-scene");
    await fireEvent.input(field, { target: { value: "Crypt" } });
    await fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() =>
      expect(env.store.renameScene).toHaveBeenCalledWith("Crypt"),
    );
  });

  it("cancels with Escape and restores the current name", async () => {
    env.store.session = { sceneName: "Arrival", sceneSectionId: "sec1" };
    render(SoloSceneField);
    const field = screen.getByTestId("solo-scene") as HTMLInputElement;
    await fireEvent.input(field, { target: { value: "Something else" } });
    await fireEvent.keyDown(field, { key: "Escape" });
    expect(field.value).toBe("Arrival");
    expect(env.store.renameScene).not.toHaveBeenCalled();
  });

  it("does not submit an empty name", async () => {
    render(SoloSceneField);
    const field = screen.getByTestId("solo-scene");
    await fireEvent.input(field, { target: { value: "   " } });
    await fireEvent.click(screen.getByTestId("solo-scene-new"));
    expect(env.store.setScene).not.toHaveBeenCalled();
  });
});
