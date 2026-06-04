/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ZenImageLightbox from "./ZenImageLightbox.svelte";

describe("ZenImageLightbox", () => {
  beforeEach(() => {
    HTMLElement.prototype.animate = vi.fn().mockReturnValue({
      cancel: vi.fn(),
      finished: Promise.resolve(),
      onfinish: null,
      oncancel: null,
      pause: vi.fn(),
      play: vi.fn(),
      reverse: vi.fn(),
    } as unknown as Animation);
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
});
