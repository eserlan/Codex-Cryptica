/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ZenImageLightbox from "./ZenImageLightbox.svelte";
import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
import { p2pHost } from "#lib/cloud-bridge/p2p/host-service.svelte.js";
import { mapSession } from "#lib/stores/map-session.svelte.js";

describe("ZenImageLightbox", () => {
  beforeEach(() => {
    HTMLElement.prototype.animate = vi.fn().mockImplementation(() => {
      const anim = {
        cancel: vi.fn(),
        finished: Promise.resolve(),
        onfinish: null as (() => void) | null,
        oncancel: null as (() => void) | null,
        pause: vi.fn(),
        play: vi.fn(),
        reverse: vi.fn(),
      };
      queueMicrotask(() => anim.onfinish?.());
      return anim as unknown as Animation;
    });
  });
  it("opens the image in a standalone browser window", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    render(ZenImageLightbox, {
      show: true,
      imageUrl: "https://example.com/image.webp",
      title: "Test image",
    });

    await fireEvent.click(
      screen.getByRole("button", {
        name: "Open image in standalone window",
      }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/image.webp",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("renders a loading state when imageUrl is not provided", () => {
    render(ZenImageLightbox, {
      show: true,
      imageUrl: "",
      title: "Loading image",
    });

    expect(screen.getByText("Resolving Neural Visual...")).toBeTruthy();
  });

  it("renders the image element with correct attributes when imageUrl is provided", () => {
    render(ZenImageLightbox, {
      show: true,
      imageUrl: "https://example.com/img.jpg",
      title: "Custom Title",
    });

    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://example.com/img.jpg");
    expect(img.getAttribute("alt")).toBe("Custom Title");
  });

  it("renders extraActions share button when hosting with an imagePath and closes on Escape", async () => {
    const hostingSpy = vi
      .spyOn(p2pHost, "isHosting", "get")
      .mockReturnValue(true);
    modalUIStore.lightbox.imagePath = "images/map-handout.webp";
    const showImageSpy = vi
      .spyOn(mapSession, "showImageToPlayers")
      .mockReturnValue(true);

    try {
      render(ZenImageLightbox, {
        show: true,
        imageUrl: "https://example.com/handout.webp",
        title: "Handout",
      });

      const shareBtn = screen.getByRole("button", {
        name: "Share image with guests",
      });
      await fireEvent.click(shareBtn);
      expect(showImageSpy).toHaveBeenCalledWith(
        "Handout",
        "images/map-handout.webp",
      );

      await fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    } finally {
      hostingSpy.mockRestore();
      modalUIStore.lightbox.imagePath = "";
      showImageSpy.mockRestore();
    }
  });
});
