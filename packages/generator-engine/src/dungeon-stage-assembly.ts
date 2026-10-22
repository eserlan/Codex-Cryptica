/** Build the established inventory and assemble validated stage drafts. */
import { asArray as arr, asRecord as rec } from "./llm-response-utils";
import { text, textList, presenceOf } from "./dungeon-stage-data";
import type { DungeonJson, ResolvedDungeon } from "./public-dungeon";
import type { JsonObject as Json } from "./staged-runtime";

function sectorsFrom(
  resolved: ResolvedDungeon,
  data: Json,
): DungeonJson["sectors"] {
  const byId = new Map(arr(data.sectors).map((s) => [text(rec(s).id), rec(s)]));
  return resolved.sectors.map((plan) => {
    const s = byId.get(plan.id) ?? {};
    return {
      id: plan.id,
      name: text(s.name),
      description: text(s.description),
      stockType: plan.stockType,
      stockDetail: text(s.stockDetail),
    };
  });
}

function factionsFrom(resolved: ResolvedDungeon, data: Json): Json[] {
  return arr(data.factions).map((f, i) => {
    const { presence: _presence, ...rest } = rec(f);
    return {
      ...rest,
      // The drive is fixed input, not something the model gets to change.
      drive: resolved.factions[i]?.drive ?? text(rec(f).drive),
    };
  });
}

/** Each faction's presence, moved onto the sectors it holds. */
function withPresence(
  sectors: DungeonJson["sectors"],
  data: Json,
): DungeonJson["sectors"] {
  const bySector = new Map<string, { faction: string; detail: string }[]>();
  for (const f of arr(data.factions).map(rec)) {
    const held = new Set(arr(f.territorySectorIds).map(String));
    for (const p of presenceOf(f)) {
      if (!held.has(p.sectorId)) continue;
      const list = bySector.get(p.sectorId) ?? [];
      list.push({ faction: text(f.name), detail: p.detail });
      bySector.set(p.sectorId, list);
    }
  }
  return sectors.map((s) =>
    bySector.has(s.id) ? { ...s, presence: bySector.get(s.id) } : s,
  );
}

/** The foundation stage's validated output, as the facts later stages receive. */
export function foundationFactsOf(f: Json) {
  return {
    title: text(f.title),
    throughline: text(f.throughline),
    history: text(f.history),
    currentState: text(f.currentState),
    signatureFeature: text(f.signatureFeature),
    secret: text(f.secret),
    sectorBriefs: arr(f.sectorBriefs).map((b) => ({
      id: text(rec(b).id),
      brief: text(rec(b).brief),
    })),
  };
}

/** Geography and inventory shared by faction validation and final assembly. */
export function geographyFactsOf(
  resolved: ResolvedDungeon,
  facts: ReturnType<typeof foundationFactsOf>,
  data: Json,
) {
  const sectors = sectorsFrom(resolved, data);
  const hazards = textList(data.hazards);
  const treasures = textList(data.treasures);
  const hooks = textList(data.hooks);
  const inventory = {
    title: facts.title,
    history: facts.history,
    currentState: facts.currentState,
    signatureFeature: facts.signatureFeature,
    secret: facts.secret,
    hazards,
    treasures,
  };
  return { sectors, hazards, treasures, hooks, inventory };
}

export interface DungeonStageDrafts {
  foundation: Json;
  facts: ReturnType<typeof foundationFactsOf>;
  geography: ReturnType<typeof geographyFactsOf>;
  factions: Json;
}

/** Preserve fixed stock types and drives, and move faction presence onto sectors. */
export function assembleDungeon(
  resolved: ResolvedDungeon,
  { foundation, facts, geography, factions }: DungeonStageDrafts,
): Json {
  return {
    ...geography.inventory,
    summary: text(foundation.summary),
    throughline: facts.throughline,
    sectors: withPresence(geography.sectors, factions),
    hooks: geography.hooks,
    factionSituation: text(factions.factionSituation),
    factions: factionsFrom(resolved, factions),
  };
}
