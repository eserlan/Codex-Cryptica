/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GeneratorSwitcherMenu from "./GeneratorSwitcherMenu.svelte";
import { themeStore } from "$lib/stores/theme.svelte";

vi.mock("$app/paths", () => ({
  base: "",
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
    themeStore.worldThemeId = "workspace";
  });

  it("shows fantasy-only generators when the world theme is fantasy", async () => {
    themeStore.worldThemeId = "fantasy";
    render(GeneratorSwitcherMenu, {
      props: {
        canonicalPath: "/generators/faction",
        eyebrow: "Faction Generator",
      },
    });

    await fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("D&D NPC Generator")).toBeTruthy();
    expect(screen.getByText("Kingdom Generator")).toBeTruthy();
  });

  it("hides fantasy-only generators and horror-only generators outside those themes", async () => {
    themeStore.worldThemeId = "cyberpunk";
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
  });

  it("hides the nomad clan generator in Pirate mode", async () => {
    themeStore.worldThemeId = "pirate";
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

  it("shows horror-only generators when the world theme is horror", async () => {
    themeStore.worldThemeId = "horror";
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
    expect(currentLink.className).toContain("text-theme-primary");
  });
});
