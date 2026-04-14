/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ZenImageLightbox from "./ZenImageLightbox.svelte";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

describe("ZenImageLightbox", () => {
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
});
