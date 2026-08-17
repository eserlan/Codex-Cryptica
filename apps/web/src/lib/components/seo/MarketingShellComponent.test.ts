/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
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

vi.mock("$app/navigation", () => ({
  afterNavigate: vi.fn(),
}));

vi.mock("$lib/config", () => ({
  DISCORD_URL: "https://discord.gg/5UUMCChF2u",
  GITHUB_URL: "https://github.com/eserlan/Codex-Cryptica",
  REDDIT_URL: "https://www.reddit.com/r/codexcryptica/",
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

  it("toggles mobile navigation menu including community links", async () => {
    render(MarketingShell);

    const toggleBtn = screen.getByTestId("shell-menu-toggle");
    expect(screen.queryByTestId("shell-mobile-nav")).toBeNull();

    await fireEvent.click(toggleBtn);
    const mobileNav = screen.getByTestId("shell-mobile-nav");
    expect(mobileNav).toBeTruthy();
    expect(mobileNav.textContent).toContain("Discord");
    expect(mobileNav.textContent).toContain("GitHub");
    expect(mobileNav.textContent).toContain("Reddit");
  });
});
