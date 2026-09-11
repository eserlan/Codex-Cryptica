import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the fix for #2578.
 *
 * The chrome shield in `app.css` neutralises world-theme fonts and colours so
 * site navigation stays legible whatever theme is active. It used to select the
 * bare `header` and `footer` elements, which caught every such element in the
 * app — page titles, panel headers, card headers — and forced them to the
 * chrome sans stack. Because the rule uses `!important` on `--font-header`, a
 * `font-header` utility on the element could not override it, so the bug was
 * invisible while authoring.
 *
 * These tests pin the two halves of the fix: the selector is opt-in, and the
 * components that genuinely are chrome opt in.
 */

const SRC = join(import.meta.dirname, "../..");
const APP_CSS = readFileSync(join(SRC, "app.css"), "utf8");

/** The shield rule, from its comment marker to its closing brace. */
function shieldRule(): string {
  const marker = "Shield app chrome from world theme colors and fonts";
  const start = APP_CSS.indexOf(marker);
  expect(start, "shield rule not found in app.css").toBeGreaterThan(-1);

  const open = APP_CSS.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < APP_CSS.length; i += 1) {
    if (APP_CSS[i] === "{") depth += 1;
    else if (APP_CSS[i] === "}") {
      depth -= 1;
      if (depth === 0) return APP_CSS.slice(start, i + 1);
    }
  }
  throw new Error("unbalanced braces in the shield rule");
}

/** Everything between the comment and the opening brace. */
function shieldSelector(): string {
  const rule = shieldRule();
  return rule.slice(rule.indexOf("*/") + 2, rule.indexOf("{"));
}

describe("chrome shield selector", () => {
  it("is opt-in by class, never by element name", () => {
    const selector = shieldSelector();
    // A bare element selector here re-breaks every page title in the app.
    expect(selector).not.toMatch(/(^|[\s,])header\s*[,{]/);
    expect(selector).not.toMatch(/(^|[\s,])footer\s*[,{]/);
  });

  it("still shields the chrome classes it was written for", () => {
    const selector = shieldSelector();
    expect(selector).toContain(".chrome-shield");
    expect(selector).toContain(".bg-chrome-surface");
    expect(selector).toContain(".bg-chrome-bg");
  });

  it("still neutralises the theme fonts", () => {
    // The rule's actual job; a selector fix must not quietly gut it.
    const rule = shieldRule();
    expect(rule).toContain("--font-header:");
    expect(rule).toContain("--font-body:");
    expect(rule).toContain("!important");
  });
});

describe("chrome components opt in", () => {
  const read = (path: string) => readFileSync(join(SRC, path), "utf8");

  it.each([
    ["lib/components/seo/MarketingShell.svelte", "header"],
    ["lib/components/seo/MarketingFooter.svelte", "footer"],
  ])("%s carries chrome-shield on its %s", (path, tag) => {
    const source = read(path);
    const match = source.match(new RegExp(`<${tag}[^>]*>`, "s"));
    expect(match, `no <${tag}> found in ${path}`).not.toBeNull();
    expect(match?.[0]).toContain("chrome-shield");
  });

  it.each([
    ["lib/components/layout/AppHeader.svelte", "bg-chrome-surface"],
    ["lib/components/layout/AppFooter.svelte", "bg-chrome"],
  ])("%s is already shielded by %s", (path, marker) => {
    expect(read(path)).toContain(marker);
  });
});

describe("page-level headers are not shielded", () => {
  /** Every .svelte file under src, with HTML comments stripped. */
  function* svelteFiles(dir: string): Generator<[string, string]> {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".svelte-kit") continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        yield* svelteFiles(full);
      } else if (name.endsWith(".svelte")) {
        yield [
          full,
          readFileSync(full, "utf8").replace(/<!--[\s\S]*?-->/g, ""),
        ];
      }
    }
  }

  it("applies chrome-shield to chrome only, not to page or panel headers", () => {
    const shielded: string[] = [];
    for (const [path, source] of svelteFiles(SRC)) {
      for (const match of source.matchAll(/<(?:header|footer)[^>]*>/g)) {
        if (match[0].includes("chrome-shield")) shielded.push(path);
      }
    }
    // Exactly the two components that render site chrome. AppHeader/AppFooter
    // are covered by their existing bg-chrome-* classes instead.
    expect(
      [...new Set(shielded)].map((p) => p.slice(SRC.length + 1)).sort(),
    ).toEqual([
      "lib/components/seo/MarketingFooter.svelte",
      "lib/components/seo/MarketingShell.svelte",
    ]);
  });

  it("lets the answer pages use a semantic header again", () => {
    for (const path of [
      "routes/(marketing)/answers/+page.svelte",
      "routes/(marketing)/answers/[slug]/+page.svelte",
    ]) {
      const source = readFileSync(join(SRC, path), "utf8");
      expect(source, path).toMatch(/<header[^>]*>/);
      expect(source, path).not.toContain("A plain div, not <header>");
    }
  });
});
