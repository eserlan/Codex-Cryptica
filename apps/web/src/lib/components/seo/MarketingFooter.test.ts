/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MarketingFooter from "./MarketingFooter.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/config", () => ({
  DISCORD_URL: "https://discord.gg/5UUMCChF2u",
  GITHUB_URL: "https://github.com/eserlan/Codex-Cryptica",
  REDDIT_URL: "https://www.reddit.com/r/codexcryptica/",
  PATREON_URL: "https://patreon.com/EspenE",
}));

describe("MarketingFooter", () => {
  it("renders community links alongside standard footer links", () => {
    render(MarketingFooter);

    const discordLink = screen.getByRole("link", { name: "Discord" });
    expect(discordLink.getAttribute("href")).toBe(
      "https://discord.gg/5UUMCChF2u",
    );
    expect(discordLink.getAttribute("target")).toBe("_blank");

    const redditLink = screen.getByRole("link", { name: "Reddit" });
    expect(redditLink.getAttribute("href")).toBe(
      "https://www.reddit.com/r/codexcryptica/",
    );
    expect(redditLink.getAttribute("target")).toBe("_blank");

    const githubLink = screen.getByRole("link", { name: "GitHub" });
    expect(githubLink.getAttribute("href")).toBe(
      "https://github.com/eserlan/Codex-Cryptica",
    );
    expect(githubLink.getAttribute("target")).toBe("_blank");

    const patreonLink = screen.getByRole("link", { name: "Patreon" });
    expect(patreonLink.getAttribute("href")).toBe("https://patreon.com/EspenE");
    expect(patreonLink.getAttribute("target")).toBe("_blank");

    expect(screen.getByRole("link", { name: "Terms" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tools" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sitemap" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "LLM Docs" })).toBeTruthy();
  });

  it("renders extra links when provided", () => {
    render(MarketingFooter, {
      extraLinks: [{ href: "/custom-path", label: "Custom Link" }],
    });

    expect(screen.getByRole("link", { name: "Custom Link" })).toBeTruthy();
  });
});
