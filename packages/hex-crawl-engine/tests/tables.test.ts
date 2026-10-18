import { describe, expect, it } from "bun:test";
import { PRESET_TERRAIN_IDS } from "../src/terrain";
import { TERRAIN_TABLES } from "../src/tables/terrain-tables";
import { GENERAL_TABLES } from "../src/tables/general-tables";
import { TABLE_PART_IDS, type TableSet } from "../src/tables/types";

const sets: [string, TableSet][] = [
  ...PRESET_TERRAIN_IDS.map((id): [string, TableSet] => [
    id,
    TERRAIN_TABLES[id],
  ]),
  ["general", GENERAL_TABLES],
];

describe("offline discovery tables (T066)", () => {
  it("every preset terrain and the general set have at least 8 entries per part", () => {
    for (const [name, set] of sets) {
      for (const part of TABLE_PART_IDS) {
        expect(set[part].length, `${name}.${part}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("landmark and encounter entries are Title | Description", () => {
    for (const [, set] of sets) {
      for (const part of ["landmark", "encounter"] as const) {
        for (const entry of set[part]) {
          const at = entry.indexOf(" | ");
          expect(at).toBeGreaterThan(0);
          expect(entry.slice(0, at).length).toBeLessThanOrEqual(80);
          expect(entry.slice(at + 3).length).toBeLessThanOrEqual(1200);
        }
      }
    }
  });

  it("negative: no entry is blank, and no entry carries template braces", () => {
    for (const [, set] of sets) {
      for (const part of TABLE_PART_IDS) {
        for (const entry of set[part]) {
          expect(entry.trim().length).toBeGreaterThan(0);
          expect(entry).not.toMatch(/[{}]/);
        }
      }
    }
  });
});
