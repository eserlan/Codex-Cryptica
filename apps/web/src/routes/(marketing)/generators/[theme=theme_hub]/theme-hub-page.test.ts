/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";

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
    expect(link.getAttribute("href")).toBe(
      "/generators/pirate/ship-generator",
    );
  });
});
