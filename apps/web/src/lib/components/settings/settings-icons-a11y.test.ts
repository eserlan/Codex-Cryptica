import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const settingsDirectory = join(process.cwd(), "src/lib/components/settings");
const components = [
  "CloudDestinationSettings.svelte",
  "DriveSettings.svelte",
  "ImportSettings.svelte",
  "ThemeSelector.svelte",
  "VaultSettings.svelte",
  "WorldThemePicker.svelte",
];

describe("settings decorative icons", () => {
  it("keeps every Iconify span out of the accessibility tree", () => {
    for (const component of components) {
      const source = readFileSync(join(settingsDirectory, component), "utf8");
      const iconSpans = (source.match(/<span\b[^>]*>/g) ?? []).filter(
        (tag) => tag.includes("icon-[") || tag.includes("{option.icon}"),
      );

      expect(iconSpans, component).not.toHaveLength(0);
      expect(
        iconSpans.every((tag) => tag.includes('aria-hidden="true"')),
        component,
      ).toBe(true);
    }
  });
});
