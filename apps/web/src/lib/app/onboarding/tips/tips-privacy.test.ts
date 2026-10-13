import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Spec 176 privacy guards (FR-011, FR-012, SC-002, SC-008): the tips code must
 * not read vault content, watch input, or send anything. These are source-level
 * checks, so a regression fails here before review.
 */
const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const FILES = {
  store: "./tips-store.svelte.ts",
  runtime: "./tips-runtime.ts",
  engine: "../../../../../../../packages/onboarding-journey-engine/src/tips.ts",
  chip: "../../../components/onboarding/CifTipChip.svelte",
  optIn: "../../../components/onboarding/TipsOptIn.svelte",
  setting: "../../../components/settings/CifTipsSetting.svelte",
} as const;

const SENDS =
  /\bfetch\s*\(|sendBeacon|XMLHttpRequest|analytics|telemetry|\btrack\s*\(/i;

describe("Cif tips privacy (spec 176)", () => {
  for (const [name, path] of Object.entries(FILES)) {
    it(`${name} sends nothing and reads no keystrokes`, () => {
      const src = read(path);
      expect(src).not.toMatch(SENDS);
      expect(src).not.toMatch(
        /addEventListener\(\s*["']key(down|press|up)["']/,
      );
      expect(src).not.toMatch(/addEventListener\(\s*["']click["']/);
    });
  }

  it("the engine and the store never import vault or entity content", () => {
    for (const path of [FILES.engine, FILES.store]) {
      const src = read(path);
      expect(src).not.toMatch(/from\s+["'][^"']*(vault|entit|entry|oracle)/i);
    }
  });

  it("the runtime reads only the vault's readiness, never its entries", () => {
    const src = read(FILES.runtime);
    expect(src).not.toMatch(/vault\.(entities|entries|getEntity|list|search)/);
    expect(src).toContain("generatorsAvailable(vault, sessionModeStore)");
  });

  it("the stored record holds identifiers and flags only", () => {
    const src = read(FILES.engine);
    // The record schema lists its fields; none of them can hold text or names.
    const schema = src.slice(
      src.indexOf("const TipsRecordSchema"),
      src.indexOf("export type TipsRecord"),
    );
    expect(schema).not.toMatch(/z\.string\(\)\.(max|min)\(\d{3,}\)/);
    expect(schema).not.toMatch(/name|title|content|text|vault/i);
  });
});
