import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Guard for #3718: use text-nano/micro/meta/helper tokens, not tiny px literals.
const roots = [
  resolve(process.cwd(), "src"),
  resolve(process.cwd(), "../../packages"),
];

const hasSub12pxHtmlText = (markup: string) => {
  const htmlOutsideSvg = markup.replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, "");
  return /(?<![\w-])text-\[(?:[0-9]|1[01])px\]/.test(htmlOutsideSvg);
};

const walk = (dir: string, out: string[] = []) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".svelte-kit") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(svelte|html)$/.test(name)) out.push(p);
  }
  return out;
};

describe("mobile typography guard", () => {
  it("has no sub-12px arbitrary text sizes in markup", () => {
    const offenders = roots
      .flatMap((r) => walk(r))
      .filter((f) => hasSub12pxHtmlText(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("flags a tiny arbitrary size when one is introduced", () => {
    expect(hasSub12pxHtmlText('<p class="text-[10px]">')).toBe(true);
    expect(hasSub12pxHtmlText('<p class="md:text-[11px]">')).toBe(true);
    expect(hasSub12pxHtmlText('<p class="text-meta text-[13px]">')).toBe(false);
    expect(
      hasSub12pxHtmlText('<svg><text class="text-[9px]">Map</text></svg>'),
    ).toBe(false);
  });
});
