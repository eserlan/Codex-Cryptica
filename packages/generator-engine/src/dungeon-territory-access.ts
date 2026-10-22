/** Check faction territory against the fixed sector connections. */
import type { DungeonSectorEdge } from "./public-dungeon";
import type { FactionLike } from "./dungeon-staged-types";

/**
 * Wording that says how a faction gets across ground it does not hold, or
 * that it holds out cut off. A keyword guess, so a split territory is only
 * ever a soft problem fed to a retry, never a rejection. Known limits: any
 * mention of the sector in between counts as an explanation, and a truce
 * mentioned for another reason ("a truce-breaker") also counts.
 */
const CROSSING =
  /\b(cross(es|ing)? (the|through)|pass(es|ing)? (through|past)|smuggl\w*|truce|toll|safe[- ]conduct|escort(s|ed)? through|secret (route|passage|tunnel)|isolated|enclave|besieged|stranded)\b/i;

/** Breadth-first discoveries and their parents, in fixed-layout order. */
function* walkSectors(
  next: readonly number[][],
  starts: Iterable<number>,
  allowed: (i: number) => boolean = () => true,
): Generator<{ node: number; from: number }> {
  const queue = [...starts];
  const seen = new Set(queue);
  for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
    for (const n of next[i] ?? []) {
      if (seen.has(n) || !allowed(n)) continue;
      seen.add(n);
      yield { node: n, from: i };
      queue.push(n);
    }
  }
}

function pathAcrossGap(
  from: ReadonlyMap<number, number>,
  target: number,
  linked: ReadonlySet<number>,
): number[] {
  const path: number[] = [];
  for (
    let p = from.get(target);
    p !== undefined && !linked.has(p);
    p = from.get(p)
  ) {
    path.unshift(p);
  }
  return path;
}

/** The ground on the shortest walk to the nearest disconnected held sector. */
function gapBetween(
  next: readonly number[][],
  linked: ReadonlySet<number>,
  held: ReadonlySet<number>,
): number[] {
  const from = new Map<number, number>();
  for (const step of walkSectors(next, linked)) {
    from.set(step.node, step.from);
    if (held.has(step.node)) return pathAcrossGap(from, step.node, linked);
  }
  return [];
}

type Sector = { id: string; name: string };

function explainsCrossing(f: FactionLike, between: readonly Sector[]): boolean {
  const said = [
    f.strength,
    f.obstacle,
    f.relationship,
    f.goal,
    ...(f.presence ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return (
    CROSSING.test(said) ||
    between.some(
      (s) => said.includes(s.id) || said.includes(s.name.toLowerCase()),
    )
  );
}

function territoryIssues(
  f: FactionLike,
  sectors: readonly Sector[],
  index: ReadonlyMap<string, number>,
  next: readonly number[][],
): string[] {
  const own = f.territorySectorIds
    .map((id) => index.get(id))
    .filter((i): i is number => i !== undefined);
  if (own.length < 2) return [];
  const held = new Set(own);
  const linked = new Set([own[0]]);
  for (const step of walkSectors(next, [own[0]], (i) => held.has(i))) {
    linked.add(step.node);
  }
  if (own.every((i) => linked.has(i))) return [];
  const between = gapBetween(next, linked, held).map((i) => sectors[i]);
  if (explainsCrossing(f, between)) return [];
  const names = own.map((i) => sectors[i].name).join(" and ");
  return [
    `${f.name} holds ${names}, which only connect through ${between.map((s) => s.name).join(" or ")}; say how ${f.name} moves between them or holds ground across the gap, or give it connected territory`,
  ];
}

/** Territory with no connected walk and no explanation in the faction's prose. */
export function checkTerritoryAccess(
  factions: readonly FactionLike[],
  sectors: ReadonlyArray<{ id: string; name: string }>,
  edges: readonly DungeonSectorEdge[],
): string[] {
  const index = new Map(sectors.map((s, i) => [s.id, i]));
  const next = sectors.map(() => [] as number[]);
  for (const e of edges) {
    next[e.from]?.push(e.to);
    next[e.to]?.push(e.from);
  }
  return factions.flatMap((f) => territoryIssues(f, sectors, index, next));
}
