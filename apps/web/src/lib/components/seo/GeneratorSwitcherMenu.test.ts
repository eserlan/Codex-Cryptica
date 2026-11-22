/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GeneratorSwitcherMenu from "./GeneratorSwitcherMenu.svelte";
import { publicThemeStore } from "#lib/stores/public-theme.svelte.js";
import { THEME_STORAGE_KEY } from "#lib/theme/theme-dom.js";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

vi.mock("$app/environment", () => ({
  browser: true,
}));

// Stub Element.prototype.animate for JSDOM / Svelte 5 transitions compatibility
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () => {
    return {
      cancel: () => {},
      finish: () => {},
      pause: () => {},
      play: () => {},
      reverse: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any;
  };
}

describe("GeneratorSwitcherMenu", () => {
  beforeEach(() => {
    localStorage.clear();
    publicThemeStore.clear();
  });

  it("falls back to stored world theme from localStorage when publicThemeStore is cleared", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "horror");
    render(GeneratorSwitcherMenu, {
      props: {
        canonicalPath: "/generators/faction",
        eyebrow: "Faction Generator",
      },
    });

    await fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Vampire Clan Generator")).toBeTruthy();
    expect(screen.queryByText("RPG Item & Loot Generator")).toBeNull();
  });

  it("shows fantasy-only generators when the world theme is fantasy", async () => {
    publicThemeStore.setTheme("fantasy");
    render(GeneratorSwitcherMenu, {
      props: {
        canonicalPath: "/generators/faction",
        eyebrow: "Faction Generator",
      },
    });

    await fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("D&D NPC Generator")).toBeTruthy();
    expect(screen.getByText("Kingdom Generator")).toBeTruthy();
    expect(screen.getByText("RPG Item & Loot Generator")).toBeTruthy();
  });

  it("lists generators from the shared catalogue under its categories", async () => {
    publicThemeStore.setTheme("scifi");
    render(GeneratorSwitcherMenu, {
      props: {
        canonicalPath: "/generators/world",
        eyebrow: "Sci-Fi World Generator",
      },
    });

    await fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Realms, Worlds & Creatures")).toBeTruthy();
    expect(
      screen
        .getByText("Sci-Fi World Generator", { selector: "a" })
        .getAttribute("href"),
    ).toBe("/generators/world");
    expect(screen.queryByText("RPG Item & Loot Generator")).toBeNull();
  });

  it("hides fantasy-only generators and horror-only generators outside those themes", async () => {
    publicThemeStore.setTheme("cyberpunk");
    render(GeneratorSwitcherMenu, {
      props: {
        canonicalPath: "/generators/faction",
        eyebrow: "Faction Generator",
      },
    });

    await fireEvent.click(screen.getByRole("button"));

    expect(screen.queryByText("D&D NPC Generator")).toBeNull();
    expect(screen.queryByText("Vampire Clan Generator")).toBeNull();
    expect(
      screen.getByText("Faction Generator", { selector: "a" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Plot Twist & Complication Generator", {
        selector: "a",
      }),
    ).toBeTruthy();
  });

  it("hides the nomad clan generator in Pirate mode", async () => {
    publicThemeStore.setTheme("pirate");
    render(GeneratorSwitcherMenu, {
      props: {
        canonicalPath: "/generators/ship-generator",
        eyebrow: "Pirate Ship Generator",
      },
    });

    await fireEvent.click(screen.getByRole("button"));

    expect(screen.queryByText("Nomad Clan Generator")).toBeNull();
    expect(screen.getByText("Ship Generator")).toBeTruthy();
  });

  it("hides the nomad clan generator in Cosmic Horror mode", async () => {
    publicThemeStore.setTheme("cosmic_horror");
    render(GeneratorSwitcherMenu, {
      props: {
        canonicalPath: "/generators/faction",
        eyebrow: "Faction Generator",
      },
    });

    await fireEvent.click(screen.getByRole("button"));

    expect(screen.queryByText("Nomad Clan Generator")).toBeNull();
  });

  it("keeps the nomad clan generator in Cyberpunk mode", async () => {
    publicThemeStore.setTheme("cyberpunk");
    render(GeneratorSwitcherMenu, {
      props: {
        canonicalPath: "/generators/faction",
        eyebrow: "Faction Generator",
      },
    });

    await fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Nomad Clan Generator")).toBeTruthy();
  });

  it("shows horror-only generators when the world theme is horror", async () => {
    publicThemeStore.setTheme("horror");
    render(GeneratorSwitcherMenu, {
      props: {
        canonicalPath: "/generators/faction",
        eyebrow: "Faction Generator",
      },
    });

    await fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Vampire Clan Generator")).toBeTruthy();
  });

  it("marks the current generator with a check icon", async () => {
    render(GeneratorSwitcherMenu, {
      props: {
        canonicalPath: "/generators/settlement",
        eyebrow: "Settlement Generator",
      },
    });

    await fireEvent.click(screen.getByRole("button"));

    const currentLink = screen.getByText("Settlement Generator", {
      selector: "a",
    });
    expect(
      currentLink
        .querySelector("span")
        ?.classList.contains("icon-[lucide--check]"),
    ).toBe(true);
  });
});
