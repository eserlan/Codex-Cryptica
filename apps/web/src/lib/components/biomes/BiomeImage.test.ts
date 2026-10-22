/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import BiomeImage from "./BiomeImage.svelte";
import type { ImageRef } from "biome-engine";

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
  it("shows alt text and an AI illustration label with tool and date for a generated image", () => {
    render(BiomeImage, { props: { image: generated, biomeName: "Tundra" } });
    const img = screen.getByRole("img", { name: generated.alt });
    expect(img.getAttribute("src")).toBe(generated.url);
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(screen.getByText(/AI illustration/)).toBeTruthy();
    expect(screen.getByText(/Test Model 1/)).toBeTruthy();
    expect(screen.getByText(/2026-10-21/)).toBeTruthy();
    expect(screen.queryByText(/photo/i)).toBeNull();
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
});
