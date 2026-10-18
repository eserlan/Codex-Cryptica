import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import Page from "./+page.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$app/environment", () => ({
  browser: true,
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
    } as any;
  };
}

describe("Free RPG Campaign Manager Page", () => {
  it("renders without an internal navigation header or duplicate footer", () => {
    const { container } = render(Page);

    // Header nav is provided exclusively by MarketingShell; page should not have <nav>
    expect(container.querySelector("nav")).toBeNull();

    // Verify main page content renders
    expect(
      screen.getByRole("heading", {
        name: /Free RPG Campaign Manager & Lore Vault/i,
      }),
    ).toBeTruthy();
  });
});
