/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MarketingFooter from "./MarketingFooter.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/config", () => ({
  PATREON_URL: "https://patreon.com/EspenE",
}));

describe("MarketingFooter", () => {
  it("renders only the legal, Explore, and Patreon symbol links, per #2760's minimal footer", () => {
    render(MarketingFooter);

    expect(screen.getByRole("link", { name: "Terms" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeTruthy();
    const exploreLink = screen.getByRole("link", { name: "Explore" });
    expect(exploreLink.getAttribute("href")).toBe("/explore");

    const patreonLink = screen.getByRole("link", {
      name: "Support Codex Cryptica on Patreon",
    });
    expect(patreonLink.getAttribute("href")).toBe("https://patreon.com/EspenE");
    expect(patreonLink.getAttribute("target")).toBe("_blank");

    // Everything else moved to /explore instead of living here too.
    expect(screen.queryByRole("link", { name: "Discord" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Reddit" })).toBeNull();
    expect(screen.queryByRole("link", { name: "GitHub" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Tools" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Answers" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sitemap" })).toBeNull();
    expect(screen.queryByRole("link", { name: "LLM Docs" })).toBeNull();
  });

  it("renders extra links when provided", () => {
    render(MarketingFooter, {
      extraLinks: [{ href: "/custom-path", label: "Custom Link" }],
    });

    expect(screen.getByRole("link", { name: "Custom Link" })).toBeTruthy();
  });
});
