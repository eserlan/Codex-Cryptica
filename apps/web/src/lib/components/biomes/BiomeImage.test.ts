/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import BiomeImage from "./BiomeImage.svelte";
import type { ImageRef } from "biome-engine";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

const host = "https://assets.codexcryptica.com/biomes/tundra";

const generated: ImageRef = {
  origin: "generated",
  url: `${host}/1.webp`,
  alt: "A flat plain of lichen and pools",
  kind: "illustration",
  tool: "Test Model 1",
  generatedAt: "2026-10-21",
  prompt: "p",
};

const licensed: ImageRef = {
  origin: "licensed",
  url: `${host}/2.webp`,
  alt: "Tundra in summer",
  kind: "photograph",
  creator: "A. Photographer",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  licence: "CC-BY-4.0",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
};

describe("BiomeImage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows alt text and an AI illustration label with tool and date for a generated image", () => {
    render(BiomeImage, { props: { image: generated, biomeName: "Tundra" } });
    const img = screen.getByRole("img", { name: generated.alt });
    expect(img.getAttribute("src")).toBe(generated.url);
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(screen.getByText(/AI illustration/)).toBeTruthy();
    expect(screen.getByText(/Test Model 1/)).toBeTruthy();
    expect(screen.getByText(/2026-10-21/)).toBeTruthy();
    expect(screen.queryByText(/^Photo/)).toBeNull();
  });

  it("omits tool and date while they are still pending", () => {
    render(BiomeImage, {
      props: {
        image: { ...generated, tool: "pending", generatedAt: "pending" },
        biomeName: "Tundra",
      },
    });
    expect(screen.getByText(/AI illustration/)).toBeTruthy();
    expect(screen.queryByText(/pending/)).toBeNull();
  });

  it("shows creator, licence and a source link for a licensed photograph", () => {
    render(BiomeImage, { props: { image: licensed, biomeName: "Tundra" } });
    expect(screen.getByText(/A\. Photographer/)).toBeTruthy();
    const licence = screen.getByRole("link", { name: /CC-BY-4\.0/ });
    expect(licence.getAttribute("href")).toBe(licensed.licenceUrl);
    const source = screen.getByRole("link", { name: /source/i });
    expect(source.getAttribute("href")).toBe(
      "https://commons.wikimedia.org/wiki/File:Example.jpg",
    );
    expect(screen.queryByText(/AI illustration/)).toBeNull();
  });

  it("labels a licensed illustration as an illustration, not a photograph", () => {
    render(BiomeImage, {
      props: {
        image: { ...licensed, kind: "illustration" },
        biomeName: "Tundra",
      },
    });
    expect(screen.getByText(/Illustration/)).toBeTruthy();
    expect(screen.queryByText(/^Photo/)).toBeNull();
  });

  it("falls back to a labelled placeholder naming the biome when the image fails", async () => {
    render(BiomeImage, { props: { image: generated, biomeName: "Tundra" } });
    await fireEvent.error(screen.getByRole("img", { name: generated.alt }));
    const placeholder = screen.getByRole("img", {
      name: /Tundra.*image unavailable/i,
    });
    expect(placeholder).toBeTruthy();
    expect(screen.getByText(/Image unavailable/i)).toBeTruthy();
  });

  it("keeps the attribution visible when the image fails", async () => {
    render(BiomeImage, { props: { image: generated, biomeName: "Tundra" } });
    await fireEvent.error(screen.getByRole("img", { name: generated.alt }));
    expect(screen.getByText(/AI illustration/)).toBeTruthy();
  });

  it("opens the image in the lightbox when clicked", async () => {
    render(BiomeImage, { props: { image: generated, biomeName: "Tundra" } });
    const button = screen.getByRole("button", {
      name: /enlarge illustration of tundra/i,
    });
    await fireEvent.click(button);
    expect(modalUIStore.lightbox.show).toBe(true);
    expect(modalUIStore.lightbox.imageUrl).toBe(generated.url);
    expect(modalUIStore.lightbox.title).toBe(generated.alt);
  });

  it("shows outbound photo search links for Wikimedia Commons and Unsplash", () => {
    render(BiomeImage, { props: { image: generated, biomeName: "Tundra" } });
    const wikimedia = screen.getByRole("link", { name: /wikimedia/i });
    expect(wikimedia.getAttribute("href")).toBe(
      "https://commons.wikimedia.org/w/index.php?search=Tundra%20landscape",
    );
    expect(wikimedia.getAttribute("target")).toBe("_blank");
    expect(wikimedia.getAttribute("rel")).toBe("noopener noreferrer");

    const unsplash = screen.getByRole("link", { name: /unsplash/i });
    expect(unsplash.getAttribute("href")).toBe(
      "https://unsplash.com/s/photos/tundra",
    );
    expect(unsplash.getAttribute("target")).toBe("_blank");
    expect(unsplash.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("copies the generation prompt when clicking Copy prompt", async () => {
    let copiedText = "";
    const clipboard = {
      writeText: async (text: string) => {
        copiedText = text;
      },
    };
    render(BiomeImage, {
      props: {
        image: { ...generated, prompt: "Frozen tundra with dwarf willows" },
        biomeName: "Tundra",
        clipboard,
      },
    });

    const copyBtn = screen.getByRole("button", { name: /copy prompt/i });
    await fireEvent.click(copyBtn);
    expect(copiedText).toBe("Frozen tundra with dwarf willows");
    expect(screen.getByText(/prompt copied!/i)).toBeTruthy();
  });

  it("does not show copied feedback when clipboard access fails", async () => {
    const clipboard = {
      writeText: async () => {
        throw new Error("Clipboard access denied");
      },
    };
    render(BiomeImage, {
      props: { image: generated, biomeName: "Tundra", clipboard },
    });

    await fireEvent.click(screen.getByRole("button", { name: /copy prompt/i }));

    expect(screen.queryByText(/prompt copied!/i)).toBeNull();
  });

  it("clears copied feedback when the two-second timer expires", async () => {
    vi.useFakeTimers();
    const clipboard = { writeText: async () => {} };
    render(BiomeImage, {
      props: { image: generated, biomeName: "Tundra", clipboard },
    });

    await fireEvent.click(screen.getByRole("button", { name: /copy prompt/i }));
    expect(screen.getByText(/prompt copied!/i)).toBeTruthy();

    await vi.advanceTimersByTimeAsync(2000);

    expect(screen.queryByText(/prompt copied!/i)).toBeNull();
  });

  it("does not schedule feedback after unmount while clipboard writing is pending", async () => {
    vi.useFakeTimers();
    let resolveWrite!: () => void;
    const clipboard = {
      writeText: () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        }),
    };
    const { unmount } = render(BiomeImage, {
      props: { image: generated, biomeName: "Tundra", clipboard },
    });

    await fireEvent.click(screen.getByRole("button", { name: /copy prompt/i }));
    unmount();
    resolveWrite();
    await Promise.resolve();
    await Promise.resolve();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("omits reference links and prompt copy when compact", () => {
    render(BiomeImage, {
      props: { image: generated, biomeName: "Tundra", compact: true },
    });
    expect(screen.queryByRole("link", { name: /wikimedia/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /unsplash/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /copy prompt/i })).toBeNull();
  });
});
