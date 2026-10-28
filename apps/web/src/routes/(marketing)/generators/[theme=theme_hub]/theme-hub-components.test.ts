/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { themeStore } from "#lib/stores/theme.svelte.js";
import { getLandingPagesForHub } from "#lib/content/for/registry.js";
import { themeConfig } from "./theme-config";
import CampaignGuides from "./CampaignGuides.svelte";
import GeneratorCardGrid from "./GeneratorCardGrid.svelte";
import HubAppearanceToggle from "./HubAppearanceToggle.svelte";
import ThemeHubHead from "./ThemeHubHead.svelte";
import ThemeHubHeader from "./ThemeHubHeader.svelte";

vi.mock("#lib/utils/base-path.js", () => ({ basePath: () => "/codex" }));

describe("CampaignGuides", () => {
  it("renders the registered guide titles, descriptions and prefixed links", () => {
    const pages = getLandingPagesForHub("vampire");
    render(CampaignGuides, { pages });
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Campaign guides for these worlds",
    );
    for (const page of pages) {
      const link = screen.getByRole("link", {
        name: `${page.hero.title} ${page.hero.tagline}`,
      });
      expect(link.getAttribute("href")).toBe(`/codex/for/${page.slug}`);
    }
  });

  it("removes the whole section when the next hub has no guides", async () => {
    const { container, rerender } = render(CampaignGuides, {
      pages: getLandingPagesForHub("vampire"),
    });
    await rerender({ pages: [] });
    expect(container.querySelector("section")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("GeneratorCardGrid", () => {
  it("renders themed links and invokes selection for both normal and random cards", async () => {
    const onselect = vi.fn();
    render(GeneratorCardGrid, {
      cards: [themeConfig.pirate.cards[0], themeConfig.pirate.cards.at(-1)!],
      theme: "pirate",
      onselect,
    });
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/codex/generators/pirate/holiday",
      "/codex/generators/random",
    ]);
    expect(onselect).not.toHaveBeenCalled();
    // Cancel navigation while exercising the real click callback.
    for (const link of links) {
      link.addEventListener("click", (event) => event.preventDefault());
      await fireEvent.click(link);
    }
    expect(onselect).toHaveBeenCalledTimes(2);
  });

  it("renders no links or selection side effects for an empty catalogue", () => {
    const onselect = vi.fn();
    render(GeneratorCardGrid, { cards: [], theme: "fantasy", onselect });
    expect(screen.queryByRole("link")).toBeNull();
    expect(onselect).not.toHaveBeenCalled();
  });
});

describe("HubAppearanceToggle", () => {
  it("switches both modes and reflects the active appearance accessibly", async () => {
    themeStore.setAppAppearance("neutral-dark");
    render(HubAppearanceToggle);
    const light = screen.getByRole("button", { name: "Light mode" });
    const dark = screen.getByRole("button", { name: "Dark mode" });
    expect(light.getAttribute("aria-pressed")).toBe("false");
    expect(dark.getAttribute("aria-pressed")).toBe("true");
    await fireEvent.click(light);
    expect(themeStore.resolvedAppAppearanceId).toBe("neutral-light");
    expect(light.getAttribute("aria-pressed")).toBe("true");
    expect(dark.getAttribute("aria-pressed")).toBe("false");
    await fireEvent.click(dark);
    expect(themeStore.resolvedAppAppearanceId).toBe("neutral-dark");
  });

  it("keeps the world theme when changing the app appearance", async () => {
    themeStore.setTheme("pirate");
    const setTheme = vi.spyOn(themeStore, "setTheme");
    render(HubAppearanceToggle);
    await fireEvent.click(screen.getByRole("button", { name: "Light mode" }));
    expect(setTheme).not.toHaveBeenCalled();
    setTheme.mockRestore();
  });
});

describe("ThemeHubHeader", () => {
  it("renders the hub introduction and back link", () => {
    render(ThemeHubHeader, { config: themeConfig.pirate });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Pirate RPG Generators",
    );
    expect(screen.getByText(themeConfig.pirate.eyebrow)).toBeTruthy();
    expect(screen.getByText(themeConfig.pirate.intro)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "All Generators" }).getAttribute("href"),
    ).toBe("/codex/generators");
  });

  it("replaces the previous hub's copy on navigation", async () => {
    const { rerender } = render(ThemeHubHeader, { config: themeConfig.pirate });
    await rerender({ config: themeConfig.superhero });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Superhero RPG Generators",
    );
    expect(screen.queryByText(themeConfig.pirate.intro)).toBeNull();
  });
});

describe("ThemeHubHead", () => {
  it("renders canonical, social, crawler and structured metadata", () => {
    render(ThemeHubHead, { theme: "pirate", config: themeConfig.pirate });
    expect(document.title).toBe(themeConfig.pirate.metaTitle);
    expect(
      document.head
        .querySelector('link[rel="canonical"]')
        ?.getAttribute("href"),
    ).toBe("https://codexcryptica.com/generators/pirate");
    expect(
      document.head.querySelector('link[rel="help"]')?.getAttribute("href"),
    ).toBe("/codex/llms.txt");
    expect(
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute("content"),
    ).toBe("index, follow");
    expect(
      document.head
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content"),
    ).toBe(themeConfig.pirate.metaTitle);
    expect(
      document.head
        .querySelector('meta[name="twitter:description"]')
        ?.getAttribute("content"),
    ).toBe(themeConfig.pirate.metaDescription);
    expect(
      document.head.querySelectorAll('script[type="application/ld+json"]'),
    ).toHaveLength(3);
  });

  it("updates metadata and removes stale structured data when the hub changes", async () => {
    const { rerender } = render(ThemeHubHead, {
      theme: "pirate",
      config: themeConfig.pirate,
    });
    await rerender({ theme: "superhero", config: themeConfig.superhero });
    expect(document.title).toBe(themeConfig.superhero.metaTitle);
    const scripts = Array.from(
      document.head.querySelectorAll('script[type="application/ld+json"]'),
    );
    expect(scripts).toHaveLength(3);
    expect(
      scripts.map((script) => script.textContent).join("\n"),
    ).not.toContain("/generators/pirate");
    expect(scripts.map((script) => script.textContent).join("\n")).toContain(
      "/generators/superhero",
    );
  });
});
