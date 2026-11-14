import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureArtworkLightbox from "./AdventureArtworkLightbox.svelte";
import { AdventureLightboxController } from "./adventure-artwork-lightbox.svelte.js";

describe("AdventureArtworkLightbox", () => {
  it("opens, deduplicates, navigates between images, and closes", async () => {
    const controller = new AdventureLightboxController();
    const img1 = {
      key: "scene:1",
      src: "blob:scene-1",
      alt: "Stone bridge over a river",
      title: "Kettleford",
      subtitle: "AI illustration",
    };
    const img1Duplicate = {
      key: "scene:1-dup",
      src: "blob:scene-1-dup",
      alt: "Stone bridge over a river",
      title: "Kettleford",
      subtitle: "AI illustration",
    };
    const img2 = {
      key: "npc:mara",
      src: "blob:mara",
      alt: "Herb-wife in a green apron",
      title: "Mara Fen",
    };

    controller.register(img1);
    controller.register(img1Duplicate);
    controller.register(img2);

    render(AdventureArtworkLightbox, { props: { controller } });
    expect(screen.queryByTestId("adventure-artwork-lightbox")).toBeNull();

    controller.open(img1);
    await Promise.resolve();

    expect(screen.getByTestId("adventure-artwork-lightbox")).toBeTruthy();
    expect(
      screen.getByTestId("adventure-lightbox-counter").textContent?.trim(),
    ).toBe("1 / 2");
    expect(
      screen.getByAltText("Stone bridge over a river").getAttribute("src"),
    ).toBe("blob:scene-1");

    await fireEvent.click(screen.getByTestId("adventure-lightbox-next"));
    expect(
      screen.getByTestId("adventure-lightbox-counter").textContent?.trim(),
    ).toBe("2 / 2");
    expect(
      screen.getByAltText("Herb-wife in a green apron").getAttribute("src"),
    ).toBe("blob:mara");

    await fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(
      screen.getByTestId("adventure-lightbox-counter").textContent?.trim(),
    ).toBe("1 / 2");

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("adventure-artwork-lightbox")).toBeNull();
  });

  it("upgrades to loadFull on open, releases on close, and restores focus to opener", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Open";
    document.body.appendChild(opener);
    opener.focus();

    const release = vi.fn();
    const loadFull = vi.fn().mockResolvedValue({
      url: "blob:scene-full",
      release,
    });
    const controller = new AdventureLightboxController();
    const item = {
      key: "scene:1",
      src: "blob:scene-preview",
      alt: "Stone bridge over a river",
      title: "Kettleford",
      loadFull,
    };

    render(AdventureArtworkLightbox, { props: { controller } });
    controller.open(item);
    await Promise.resolve();
    await Promise.resolve();

    expect(loadFull).toHaveBeenCalledTimes(1);
    expect(
      screen.getByAltText("Stone bridge over a river").getAttribute("src"),
    ).toBe("blob:scene-full");

    await fireEvent.keyDown(window, { key: "Escape" });
    await Promise.resolve();

    expect(release).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
