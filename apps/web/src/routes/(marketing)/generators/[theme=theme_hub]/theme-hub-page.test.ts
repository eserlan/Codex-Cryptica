/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";
import type { ThemeSlug } from "./+page";

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

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
    } as unknown as Animation;
  };
}

describe("Generator Theme Hub Page", () => {
  it("shows the nomad clan generator on the cyberpunk hub", () => {
    render(Page, {
      props: {
        data: {
          theme: "cyberpunk",
        },
      },
    });

    expect(
      screen.getByRole("link", { name: /nomad clan generator/i }),
    ).toBeTruthy();
  });

  it("shows the Pirate ship generator on the Pirate hub", () => {
    render(Page, {
      props: {
        data: {
          theme: "pirate",
        },
      },
    });

    const link = screen.getByRole("link", {
      name: /pirate ship generator/i,
    });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/generators/pirate/ship-generator");
  });

  it.each([
    ["sci-fi", "Sci-Fi"],
    ["cyberpunk", "Cyberpunk"],
    ["lancer", "Lancer"],
    ["space-opera-resistance", "Space Opera Resistance"],
    ["optimistic-exploration-sci-fi", "Optimistic Sci-Fi"],
  ] satisfies readonly [ThemeSlug, string][])(
    "shows the World Generator on the %s hub",
    (theme, _label) => {
      render(Page, { props: { data: { theme } } });

      const link = screen.getByRole("link", { name: /world generator/i });
      expect(link.getAttribute("href")).toBe(`/generators/${theme}/world`);
    },
  );

  it("renders a cosmic-horror hub without vampire generator content", () => {
    render(Page, {
      props: {
        data: {
          theme: "cosmic-horror",
        },
      },
    });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Cosmic Horror RPG Generators",
    );
    expect(screen.getByText(/impossible environments/i)).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: /vampire clan generator/i }),
    ).toBeNull();
  });

  it("links to the landing pages belonging to the hub", () => {
    render(Page, { props: { data: { theme: "vampire" } } });

    const vtm = screen.getByRole("link", {
      name: /Vampire: The Masquerade/i,
    });
    expect(vtm.getAttribute("href")).toBe("/for/vampire-the-masquerade");
    expect(
      screen
        .getByRole("link", { name: /for Gothic Horror/i })
        .getAttribute("href"),
    ).toBe("/for/gothic-horror");
  });

  it("omits the guides section on a hub with no landing pages", () => {
    render(Page, { props: { data: { theme: "steampunk" } } });

    expect(screen.queryByText(/Campaign guides for these worlds/i)).toBeNull();
  });
});
