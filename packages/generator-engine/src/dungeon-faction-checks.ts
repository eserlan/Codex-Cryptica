/** Shape and coherence validation for the faction stage. */
import { asArray as arr, asRecord as rec } from "./llm-response-utils";
import { text, presenceOf } from "./dungeon-stage-data";
import { checkFactionGrounding } from "./dungeon-faction-grounding";
import { checkTerritoryAccess } from "./dungeon-territory-access";
import {
  bannedNamesIn,
  PLACEHOLDER_FACTION_NAME,
  type ResolvedDungeon,
  type DungeonJson,
} from "./public-dungeon";
import type { JsonObject as Json } from "./staged-runtime";
import type {
  StageCheck,
  FactionLike,
  Inventory,
} from "./dungeon-staged-types";

const FACTION_FIELDS = [
  "identity",
  "goal",
  "obstacle",
  "origin",
  "belief",
  "strength",
  "relationship",
] as const;

function territoryProblems(
  label: string,
  f: Json,
  validSectorIds: ReadonlySet<string>,
): string[] {
  const territory = arr(f.territorySectorIds).map(String);
  if (territory.length === 0) return [`${label} has no territorySectorIds`];
  if (territory.every((id) => validSectorIds.has(id))) return [];
  return [
    `${label} territorySectorIds must be among ${[...validSectorIds].join(", ")}, got ${territory.join(", ")}`,
  ];
}

function checkFactionEntry(
  f: Json,
  index: number,
  validSectorIds: ReadonlySet<string>,
): string[] {
  const problems: string[] = [];
  const label = text(f.name) || `faction ${index + 1}`;
  const missing: string[] = FACTION_FIELDS.filter((k) => !text(f[k]));
  for (const n of ["leader", "notable"] as const) {
    if (!text(rec(f[n]).name) || !text(rec(f[n]).description)) missing.push(n);
  }
  if (missing.length > 0)
    problems.push(`${label} is missing: ${missing.join(", ")}`);
  problems.push(...territoryProblems(label, f, validSectorIds));
  if (!text(f.name)) problems.push(`faction ${index + 1} has no name`);
  else if (PLACEHOLDER_FACTION_NAME.test(text(f.name))) {
    problems.push(`${label} uses a placeholder name`);
  }
  return problems;
}
/** Held sectors with no word on what the faction has done there. */
function missingPresence(raw: Json[]): string[] {
  return raw.flatMap((f) => {
    const written = new Set(presenceOf(f).map((p) => p.sectorId));
    const missing = arr(f.territorySectorIds)
      .map(String)
      .filter((id) => !written.has(id));
    return missing.length > 0
      ? [
          `${text(f.name)} holds ${missing.join(", ")} but its presence says nothing about what it has done there`,
        ]
      : [];
  });
}

function factionLikeOf(f: Json): FactionLike {
  return {
    name: text(f.name),
    goal: text(f.goal),
    obstacle: text(f.obstacle),
    relationship: text(f.relationship),
    strength: text(f.strength),
    origin: text(f.origin),
    belief: text(f.belief),
    territorySectorIds: arr(f.territorySectorIds).map(String),
    presence: presenceOf(f).map((p) => p.detail),
  };
}

export function checkFactions(
  data: Json,
  resolved: ResolvedDungeon,
  sectors: DungeonJson["sectors"],
  inventory: Omit<Inventory, "sectors">,
  avoidNames: string[] = [],
): StageCheck {
  const hard: string[] = [];
  if (!text(data.factionSituation)) hard.push("factionSituation is missing");
  const raw = arr(data.factions).map(rec);
  if (raw.length !== 2) {
    hard.push(`expected 2 factions, got ${raw.length}`);
    return { hard, soft: [] };
  }
  const valid = new Set(sectors.map((s) => s.id));
  raw.forEach((f, i) => hard.push(...checkFactionEntry(f, i, valid)));
  const names = raw.map((f) => text(f.name).toLowerCase());
  if (names[0] && names[0] === names[1])
    hard.push("both factions have the same name");
  const banned = bannedNamesIn(
    raw.map((f) => text(f.name)),
    avoidNames,
  );
  if (banned.length > 0)
    hard.push(
      `faction names use banned or already-used names: ${banned.join(", ")}`,
    );
  if (hard.length > 0) return { hard, soft: [] };

  const factions = raw.map(factionLikeOf);
  const soft = [
    ...checkFactionGrounding(factions, text(data.factionSituation), {
      ...inventory,
      sectors,
    }),
    ...missingPresence(raw),
    ...checkTerritoryAccess(factions, sectors, resolved.sectorEdges),
  ];
  return { hard, soft };
}
