/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MarketingFooter from "./MarketingFooter.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

describe("MarketingFooter", () => {
  it("renders only the legal and Explore links, per #2760's minimal footer", () => {
    render(MarketingFooter);

    expect(screen.getByRole("link", { name: "Terms" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeTruthy();
    const exploreLink = screen.getByRole("link", { name: "Explore" });
    expect(exploreLink.getAttribute("href")).toBe("/explore");

    // Community/utility links moved to /explore instead of living here too.
    expect(screen.queryByRole("link", { name: "Discord" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Reddit" })).toBeNull();
    expect(screen.queryByRole("link", { name: "GitHub" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Patreon" })).toBeNull();
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
