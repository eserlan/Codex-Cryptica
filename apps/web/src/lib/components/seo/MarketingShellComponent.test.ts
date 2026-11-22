/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import MarketingShell from "./MarketingShell.svelte";
import { PUBLIC_LAYOUT } from "./marketing-shell";
import { lightboxStore } from "#lib/stores/ui/lightbox.svelte.js";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

vi.mock("$app/state", () => ({
  page: {
    url: new URL("https://codexcryptica.com/generators"),
  },
}));

vi.mock("#lib/config/index.js", () => ({
  DISCORD_URL: "https://discord.gg/5UUMCChF2u",
  GITHUB_URL: "https://github.com/eserlan/Codex-Cryptica",
  PATREON_URL: "https://patreon.com/EspenE",
  VERSION: "0.36.0",
}));

describe("MarketingShell component", () => {
  beforeAll(() => {
    if (!Element.prototype.animate) {
      Element.prototype.animate = vi.fn().mockReturnValue({
        cancel: vi.fn(),
        finish: vi.fn(),
        finished: Promise.resolve(),
        pause: vi.fn(),
        play: vi.fn(),
        reverse: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as typeof Element.prototype.animate;
    }
  });

  beforeEach(() => {
    lightboxStore.close();
  });

  it("renders header with community icon links and CTA", () => {
    render(MarketingShell);

    const discordLink = screen.getByTestId("shell-discord-link");
    expect(discordLink.getAttribute("href")).toBe(
      "https://discord.gg/5UUMCChF2u",
    );
    expect(discordLink.getAttribute("target")).toBe("_blank");

    const githubLink = screen.getByTestId("shell-github-link");
    expect(githubLink.getAttribute("href")).toBe(
      "https://github.com/eserlan/Codex-Cryptica",
    );
    expect(githubLink.getAttribute("target")).toBe("_blank");

    expect(screen.getByTestId("shell-cta")).toBeTruthy();
    expect(screen.getByTestId("shell-wordmark")).toBeTruthy();
  });

  it("renders direct Generators and Explore actions instead of a mobile directory menu", () => {
    render(MarketingShell);

    const generatorsLink = screen.getByTestId("shell-generators-link");
    expect(generatorsLink.getAttribute("href")).toBe("/generators");
    expect(generatorsLink.getAttribute("aria-current")).toBe("page");
    expect(generatorsLink.textContent).toContain("Generators");

    const exploreLink = screen.getByTestId("shell-explore-link");
    expect(exploreLink.getAttribute("href")).toBe("/explore");
    expect(exploreLink.textContent).toContain("Explore");
    expect(screen.queryByTestId("shell-menu-toggle")).toBeNull();
    expect(screen.queryByTestId("shell-mobile-nav")).toBeNull();
  });

  it("keeps the desktop nav to just Generators and Explore (#3140)", () => {
    render(MarketingShell);

    const nav = screen.getByTestId("shell-nav");
    const links = nav.querySelectorAll("a");
    expect(Array.from(links).map((a) => a.textContent)).toEqual([
      "Generators",
      "Explore",
    ]);
  });

  it("shares the full-width page canvas and gutters so edges align (#4461)", () => {
    render(MarketingShell);

    const inner = screen.getByTestId("shell-header-inner");
    expect(inner.className).toContain(PUBLIC_LAYOUT.canvas.full);
    expect(inner.className).toContain(PUBLIC_LAYOUT.padding.canvas);
    expect(inner.className).not.toContain("max-w-6xl");
    // Gutters live on the inner box only; the header must not add its own.
    expect(inner.closest("header")?.className).not.toMatch(/\bpx-/);
  });

  it("lazily renders ImageLightboxBase when lightboxStore opens and syncs close state", async () => {
    render(MarketingShell);
    expect(screen.queryByRole("dialog", { name: "Image View" })).toBeNull();

    lightboxStore.open(
      "https://assets.codexcryptica.com/example.webp",
      "Example Visual",
    );

    const dialog = await waitFor(() =>
      screen.getByRole("dialog", { name: "Image View" }),
    );
    expect(dialog).toBeTruthy();

    await fireEvent.click(
      screen.getByRole("button", { name: "Close image view" }),
    );
    await waitFor(() => {
      expect(lightboxStore.state.show).toBe(false);
    });
  });
});
