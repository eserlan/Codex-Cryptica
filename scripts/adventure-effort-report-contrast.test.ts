import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";

const reportPath = resolve(
  import.meta.dir,
  "../docs/experiments/adventure-effort-live-report-2026-11-23.html",
);
const reportCss = readFileSync(reportPath, "utf8");

function cssColor(source: string, property: string): string {
  const match = source.match(new RegExp(`${property}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match?.[1]) throw new Error(`Missing ${property} colour`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(first: string, second: string): number {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return (luminances[0]! + 0.05) / (luminances[1]! + 0.05);
}

describe("Last Grind live report status contrast", () => {
  it("keeps partial and conditional labels above 4.5:1 in light and dark mode", () => {
    const darkMode = reportCss.match(
      /@media \(prefers-color-scheme: dark\)\s*\{([\s\S]*?)\n\s*\}/,
    )?.[1];
    if (!darkMode) throw new Error("Missing dark colour scheme styles");

    const lightPanel = cssColor(reportCss, "--panel");
    const lightStatus = cssColor(reportCss, "--status-warning");
    const darkPanel = cssColor(darkMode, "--panel");
    const darkStatus = cssColor(darkMode, "--status-warning");

    expect(contrastRatio(lightStatus, lightPanel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkStatus, darkPanel)).toBeGreaterThanOrEqual(4.5);
  });
});
