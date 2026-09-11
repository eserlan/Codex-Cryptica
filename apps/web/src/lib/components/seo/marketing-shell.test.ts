import { describe, expect, it } from "vitest";
import {
  MARKETING_NAV,
  SHELL_WIDTHS,
  shellCtaHref,
  shellFooterLinks,
  shellUtmSource,
} from "./marketing-shell";

describe("shellUtmSource", () => {
  // These strings feed attribution reporting and predate the shared shell.
  // Renaming any of them splits an existing series, so they are pinned.
  it("keeps the comparison and solution sources the SEO layout used", () => {
    expect(shellUtmSource("/vs/world-anvil", "logo")).toBe("vs-logo");
    expect(shellUtmSource("/vs/world-anvil", "nav")).toBe("vs-nav");
    expect(shellUtmSource("/solutions/dm-tools", "logo")).toBe("solution-logo");
    expect(shellUtmSource("/solutions/dm-tools", "nav")).toBe("solution-nav");
  });

  it("keeps the generator layout's asymmetric pair", () => {
    expect(shellUtmSource("/tools/dnd-npc-generator", "logo")).toBe(
      "generator-logo",
    );
    // Not "generator-nav": the original was spelled this way.
    expect(shellUtmSource("/tools/dnd-npc-generator", "nav")).toBe(
      "generator-header-cta",
    );
    expect(shellUtmSource("/generators", "logo")).toBe("generator-logo");
  });

  it("gives pages that never had a header their own source", () => {
    expect(shellUtmSource("/blog", "logo")).toBe("marketing-logo");
    expect(shellUtmSource("/blog", "nav")).toBe("marketing-nav");
  });

  it("ignores a trailing slash", () => {
    expect(shellUtmSource("/vs/world-anvil/", "logo")).toBe("vs-logo");
  });
});

describe("shellCtaHref", () => {
  it("carries the campaign parameters the funnel reports on", () => {
    expect(shellCtaHref("/", "/blog", "nav")).toBe(
      "/?utm_source=marketing-nav&utm_medium=nav&utm_campaign=seo-funnel",
    );
  });

  it("respects a non-root base path", () => {
    expect(shellCtaHref("/preview", "/blog", "logo")).toBe(
      "/preview/?utm_source=marketing-logo&utm_medium=nav&utm_campaign=seo-funnel",
    );
  });
});

describe("shellFooterLinks", () => {
  it("keeps the extra SEO links on the pages that had them", () => {
    expect(shellFooterLinks("/vs/world-anvil").map((l) => l.href)).toEqual([
      "/free-rpg-campaign-manager",
      "/worldbuilding-tool",
    ]);
    expect(shellFooterLinks("/worldbuilding-tool")).toHaveLength(2);
  });

  it("does not add them to pages that never had them", () => {
    expect(shellFooterLinks("/blog")).toEqual([]);
    expect(shellFooterLinks("/generators")).toEqual([]);
  });
});

describe("shell configuration", () => {
  it("keeps the nav short enough to be a way back, not a sitemap", () => {
    expect(MARKETING_NAV.length).toBeLessThanOrEqual(5);
  });

  it("uses sentence case labels, per the grammar", () => {
    for (const item of MARKETING_NAV) {
      expect(item.label).not.toBe(item.label.toUpperCase());
    }
  });

  it("offers exactly the three widths the grammar allows", () => {
    expect(Object.keys(SHELL_WIDTHS)).toEqual(["narrow", "default", "wide"]);
  });
});
