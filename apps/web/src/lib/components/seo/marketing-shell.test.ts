import { describe, expect, it } from "vitest";
import {
  MARKETING_NAV,
  PUBLIC_LAYOUT,
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

  it.each([
    ["./", "./?"],
    ["../", "../?"],
    ["../../", "../../?"],
    ["/preview/", "/preview/?"],
  ])("never doubles the slash after a %s base", (base, prefix) => {
    const href = shellCtaHref(base, "/blog", "nav");
    expect(href.startsWith(prefix)).toBe(true);
    expect(href).not.toContain("//");
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

  it("offers the canonical canvas widths the grammar allows", () => {
    expect(Object.keys(SHELL_WIDTHS)).toEqual([
      "narrow",
      "default",
      "wide",
      "full",
    ]);
  });

  it("defines public layout primitives for widescreen and prose readability", () => {
    expect(PUBLIC_LAYOUT.canvas.full).toContain("max-w-7xl");
    // ~70 characters per line at text-lg (#4462); max-w-2xl measured ~81.
    expect(PUBLIC_LAYOUT.prose.measure).toBe("max-w-xl");
    expect(PUBLIC_LAYOUT.prose.measure).not.toBe(PUBLIC_LAYOUT.prose.lead);
    expect(PUBLIC_LAYOUT.prose.lead).toBe("max-w-3xl");
    expect(PUBLIC_LAYOUT.split.container).toContain("grid-cols-1");
    expect(PUBLIC_LAYOUT.split.container).toContain("lg:grid-cols-12");
    expect(PUBLIC_LAYOUT.split.content).toContain("lg:col-span-8");
    expect(PUBLIC_LAYOUT.split.aside).toContain("lg:col-span-4");
  });
});

describe("PUBLIC_LAYOUT.solo", () => {
  it("centres a no-aside article column and every direct child", () => {
    expect(PUBLIC_LAYOUT.solo.column).toContain("mx-auto");
    expect(PUBLIC_LAYOUT.solo.column).toContain("max-w-4xl");
    expect(PUBLIC_LAYOUT.solo.column).toContain("[&>*]:mx-auto");
  });

  it("does not alter the split layout used when a rail exists", () => {
    expect(PUBLIC_LAYOUT.split.content).toBe("lg:col-span-8 min-w-0");
    expect(PUBLIC_LAYOUT.split.content).not.toContain("mx-auto");
  });
});
