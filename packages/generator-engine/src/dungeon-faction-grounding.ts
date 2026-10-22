/** Inventory-based coherence checks for faction prose. */
import { sanitizeGoal } from "./public-dungeon";
import type { FactionLike, Inventory } from "./dungeon-staged-types";

const PLACE_WORDS =
  "Vault|Archive|Archives|Chamber|Hall|Stairwell|Gallery|Crypt|Tunnel|Passage|Annex|Sanctum|Cistern|Armoury|Armory|Library|Shaft|Bridge|Gate|Cellar|Lift|Elevator|Corridor|Laboratory|Reactor|Bunker";
const PLACE_PHRASE = new RegExp(
  `\\b((?:[A-Z][\\w'’-]+\\s+){1,3}(?:${PLACE_WORDS})s?)\\b`,
  "g",
);

const STOPWORDS = new Set(
  "that with from this their they have been into over under about which where when while hold held keep kept still near inside around those these there other than then them what will would could should must".split(
    " ",
  ),
);
const significant = (s: string): string[] =>
  s
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));

const ACQUIRE =
  /\b(secure|seize|recover|retrieve|obtain|claim|steal|acquire|take|find|loot|reclaim|collect|capture|locate)\b/i;
const OUT_OF_REACH =
  /\b(sealed|locked|cannot|can't|unable|out of reach|beyond (their )?reach|inaccessible|jammed|barred|guarded|trapped)\b/i;
/** Everything the dungeon has established, lower-cased, for "does this exist?" lookups. */
function inventoryCorpus(d: Inventory, factionNames: string[] = []): string {
  return [
    d.title,
    d.history,
    d.currentState,
    d.signatureFeature,
    d.secret,
    ...d.hazards,
    ...d.treasures,
    ...d.sectors.flatMap((s) => [s.name, s.description, s.stockDetail ?? ""]),
    ...factionNames,
  ]
    .join("\n")
    .toLowerCase();
}
/** Sector ids and named places a piece of faction text relies on but the delve never established. */
function unestablishedReferences(
  label: string,
  value: string,
  ids: ReadonlySet<string>,
  corpus: string,
): string[] {
  const issues: string[] = [];
  for (const m of value.matchAll(/\bsector-\d+\b/gi)) {
    if (!ids.has(m[0].toLowerCase())) {
      issues.push(`${label} refers to ${m[0]}, which does not exist`);
    }
  }
  for (const m of value.matchAll(PLACE_PHRASE)) {
    const phrase = m[1].replace(/^(the|a|an)\s+/i, "").toLowerCase();
    if (phrase && !corpus.includes(phrase)) {
      issues.push(
        `${label} names "${m[1]}", a place that is not established in the sectors or contents`,
      );
    }
  }
  return issues;
}

/** A goal to acquire something the faction's own territory already holds. */
function ownedGoalIssues(
  f: FactionLike,
  sectors: Inventory["sectors"],
): string[] {
  const goal = sanitizeGoal(f.goal);
  if (!ACQUIRE.test(goal) || OUT_OF_REACH.test(f.goal)) return [];
  const goalWords = new Set(significant(goal));
  return sectors
    .filter((s) => f.territorySectorIds.includes(s.id))
    .filter((s) => {
      const detail = significant(s.stockDetail ?? "");
      const shared = detail.filter((w) => goalWords.has(w));
      return detail.length > 0 && shared.length >= Math.min(2, detail.length);
    })
    .map(
      (s) =>
        `${f.name} goal is to get "${s.stockDetail}", which is already in its own territory (${s.name}) with no reason it is out of reach`,
    );
}

/**
 * Coherence doubts that need the established inventory: invented places and
 * goals to acquire what a faction already holds. Heuristic, so reported as
 * soft problems rather than rejecting a whole dungeon.
 */
export function checkFactionGrounding(
  factions: readonly FactionLike[],
  factionSituation: string,
  dungeon: Inventory,
): string[] {
  const corpus = inventoryCorpus(
    dungeon,
    factions.map((f) => f.name),
  );
  const ids = new Set(dungeon.sectors.map((s) => s.id));
  const issues = factions.flatMap((f) => [
    ...(
      [
        "goal",
        "obstacle",
        "relationship",
        "strength",
        "origin",
        "belief",
      ] as const
    ).flatMap((field) =>
      unestablishedReferences(`${f.name} ${field}`, f[field], ids, corpus),
    ),
    ...ownedGoalIssues(f, dungeon.sectors),
  ]);
  issues.push(
    ...unestablishedReferences(
      "factionSituation",
      factionSituation,
      ids,
      corpus,
    ),
  );
  return [...new Set(issues)];
}
