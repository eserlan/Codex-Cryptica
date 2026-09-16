/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MarketingShell from "./MarketingShell.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$app/state", () => ({
  page: {
    url: new URL("https://codexcryptica.com/features"),
  },
}));

vi.mock("$lib/config", () => ({
  DISCORD_URL: "https://discord.gg/5UUMCChF2u",
  GITHUB_URL: "https://github.com/eserlan/Codex-Cryptica",
  PATREON_URL: "https://patreon.com/EspenE",
}));

describe("MarketingShell component", () => {
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
});
