/**
 * Data-level de-duplication for one-shot adventures. A model, or the staged
 * cast list, can describe the same NPC twice (the antagonist again as a
 * supporting NPC) or record the same commitment twice. Merging them here means
 * the page never renders two profiles for one person, without spending
 * another AI call asking a model to notice.
 */

import type {
  OneShotAdventure,
  OneShotNpc,
  OneShotThread,
} from "./one-shot-types";

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/** Merge two profiles of the same NPC: keep the first, fill its gaps. */
function mergeNpc(keep: OneShotNpc, extra: OneShotNpc): OneShotNpc {
  const merged: Record<string, unknown> = { ...keep };
  for (const [key, value] of Object.entries(extra)) {
    if (key === "id") continue;
    if (
      typeof value === "string" &&
      value.trim() &&
      !String(merged[key] ?? "").trim()
    ) {
      merged[key] = value;
    }
  }
  return merged as unknown as OneShotNpc;
}

/**
 * NPCs that share an id or a name become one. The antagonist's id wins, then
 * the first one listed; scene references and the antagonist id are remapped.
 */
function dedupeNpcs(adventure: OneShotAdventure) {
  const groups = new Map<string, OneShotNpc[]>();
  const keyOf = new Map<string, string>();
  for (const npc of adventure.npcs) {
    const key = keyOf.get(npc.id) ?? (normalise(npc.name) || `id:${npc.id}`);
    keyOf.set(npc.id, key);
    groups.set(key, [...(groups.get(key) ?? []), npc]);
  }
  const remap = new Map<string, string>();
  const npcs = [...groups.values()].map((group) => {
    const keep = group.find((n) => n.id === adventure.antagonistId) ?? group[0];
    for (const n of group) remap.set(n.id, keep.id);
    return group.filter((n) => n !== keep).reduce(mergeNpc, keep);
  });
  return { npcs, remap };
}

const COMMON = new Set(
  "the and for with that this from are was were has have had their they them into but not who its his her she him our you all any can will would".split(
    " ",
  ),
);

const words = (text: string) =>
  new Set(
    normalise(text)
      .split(" ")
      .filter((w) => w.length > 2 && !COMMON.has(w)),
  );

/** Share of distinct words two texts have in common (Jaccard index). */
export function textOverlap(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / (x.size + y.size - shared);
}

/** Threads whose setups say the same thing become one. */
function dedupeThreads(threads: OneShotThread[]): OneShotThread[] {
  const kept: OneShotThread[] = [];
  for (const thread of threads) {
    const twin = kept.find(
      (k) =>
        (!!k.about && k.about === thread.about && k.kind === thread.kind) ||
        normalise(k.setup) === normalise(thread.setup) ||
        textOverlap(k.setup, thread.setup) >= 0.75,
    );
    if (!twin) {
      kept.push({ ...thread, sceneIds: [...thread.sceneIds] });
      continue;
    }
    if (thread.payoff.length > twin.payoff.length) twin.payoff = thread.payoff;
    twin.sceneIds = [...new Set([...twin.sceneIds, ...thread.sceneIds])];
  }
  return kept;
}

export function dedupeOneShot(adventure: OneShotAdventure): OneShotAdventure {
  const { npcs, remap } = dedupeNpcs(adventure);
  const threads = adventure.threads && dedupeThreads(adventure.threads);
  const npcsChanged = npcs.length !== adventure.npcs.length;
  const threadsChanged = threads?.length !== adventure.threads?.length;
  if (!npcsChanged && !threadsChanged) return adventure;
  const to = (id: string) => remap.get(id) ?? id;
  return {
    ...adventure,
    npcs,
    antagonistId: adventure.antagonistId && to(adventure.antagonistId),
    scenes: adventure.scenes.map((s) => ({
      ...s,
      npcIds: [...new Set(s.npcIds.map(to))],
    })),
    threads,
  };
}
