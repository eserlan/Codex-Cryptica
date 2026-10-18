import type { RandomSource } from "random-source-engine";

/** The parts that roll from a table. Faction presence is picked, not rolled. */
export type TableDiscoveryPart =
  "landmark" | "encounter" | "hazard" | "secret" | "atmosphere";

export type TableSet = Readonly<Record<TableDiscoveryPart, readonly string[]>>;

/**
 * Landmark and encounter entries are "Title | Description". Every other entry
 * is a single sentence. Entries are plain, system-neutral British English.
 */
export const TABLE_PART_IDS: readonly TableDiscoveryPart[] = [
  "landmark",
  "encounter",
  "hazard",
  "secret",
  "atmosphere",
];

/** Builds a weighted RandomSource (research D18) from one list of entries. */
export function buildTableSource(
  name: string,
  texts: readonly string[],
): RandomSource {
  return {
    id: name,
    name,
    kind: "table",
    labels: ["hex-crawl"],
    selection: { mode: "weighted" },
    entries: texts.map((text, index) => ({
      id: `${name}-${index}`,
      text,
      weight: 1,
    })),
  };
}
