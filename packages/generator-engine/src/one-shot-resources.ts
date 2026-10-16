/**
 * Scarce supplies for Survival one-shots. A resource is a few boxes the party
 * has at the start, spent scene by scene, so the GM can answer "can we feed
 * Tovin and still reach the monastery?" without inventing a system. Counting
 * the boxes also shows whether the cautious route runs dry before the finale.
 */

import { list, rec, str } from "./one-shot-json";
import type {
  OneShotAdventure,
  OneShotGap,
  OneShotResource,
  OneShotScene,
} from "./one-shot-types";

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const boxes = (raw: unknown) => {
  const count = Number(raw);
  return Number.isFinite(count)
    ? Math.max(0, Math.min(9, Math.round(count)))
    : 0;
};

export function parseResources(
  raw: unknown,
  sceneExists: (id: string) => boolean,
): OneShotResource[] | undefined {
  const ids = new Set<string>();
  const found = list(raw)
    .map((item, i) => {
      const r = rec(item);
      const name = str(r.name);
      return {
        id: str(r.id, slug(name) || `resource-${i + 1}`),
        name,
        start: boxes(r.start),
        unit: str(r.unit) || undefined,
        spends: list(r.spends)
          .map((s) => {
            const sp = rec(s);
            return {
              sceneId: str(sp.sceneId),
              what: str(sp.what),
              amount: boxes(sp.amount),
            };
          })
          .filter((s) => s.what && s.amount > 0 && sceneExists(s.sceneId)),
        whenEmpty: str(r.whenEmpty),
      };
    })
    .filter((r) => {
      if (!r.name || r.start < 1 || ids.has(r.id)) return false;
      ids.add(r.id);
      return true;
    })
    .slice(0, 4);
  return found.length ? found : undefined;
}

/** Boxes the cautious route must spend before the finale begins. */
function forcedSpend(r: OneShotResource, scenes: OneShotScene[]): number {
  const early = new Set(
    scenes.filter((s) => s.essential && s.kind !== "climax").map((s) => s.id),
  );
  return r.spends
    .filter((s) => early.has(s.sceneId))
    .reduce((sum, s) => sum + s.amount, 0);
}

export function checkResources(adventure: OneShotAdventure): OneShotGap[] {
  const resources = adventure.resources ?? [];
  const gap = (message: string): OneShotGap => ({ area: "scene", message });
  if (adventure.emphasis !== "Survival" && !resources.length) return [];
  if (resources.length < 2) {
    return [
      gap(
        "Name 2–4 scarce resources (food, light, warmth), how many boxes the party starts with, and what each scene costs.",
      ),
    ];
  }
  const problems = resources.flatMap((r) => [
    ...(new Set(r.spends.map((s) => s.sceneId)).size < 2
      ? [
          `${r.name} is spent in fewer than two scenes, so it never carries over.`,
        ]
      : []),
    ...(!r.whenEmpty.trim()
      ? [`Say what happens when ${r.name} runs out.`]
      : []),
    ...(forcedSpend(r, adventure.scenes) >= r.start
      ? [
          `${r.name} runs out before the finale even for a careful party (${r.start} boxes). Start with more or spend less.`,
        ]
      : []),
  ]);
  return problems.slice(0, 3).map(gap);
}

/** The GM sheet table: boxes at the start, and where each is spent. */
export function renderResources(adventure: OneShotAdventure): string {
  const { resources } = adventure;
  if (!resources?.length) return "";
  const title = (id: string) =>
    adventure.scenes.find((s) => s.id === id)?.title ?? id;
  const rows = resources.map((r) => {
    const spends = r.spends
      .map((s) => `${title(s.sceneId)}: ${s.what} (−${s.amount})`)
      .join("; ");
    return `- **${r.name}** — ${r.start} boxes${r.unit ? ` (each is ${r.unit})` : ""}. ${spends || "No costs listed."}\n  - At zero: ${r.whenEmpty}`;
  });
  return `\n## Supplies\nTrack these in boxes. What is spent early is gone for later scenes.\n${rows.join("\n")}\n`;
}

/** Template supplies for the local builder, spent across the essential scenes. */
export function localResources(scenes: OneShotScene[]): OneShotResource[] {
  const early = scenes.filter((s) => s.essential && s.kind !== "climax");
  const at = (i: number) =>
    early[Math.min(i, early.length - 1)]?.id ?? scenes[0].id;
  const last = scenes.at(-1)!.id;
  return [
    {
      id: "food",
      name: "Food",
      start: 5,
      unit: "a meal for the whole party",
      spends: [
        { sceneId: at(0), what: "the first long march", amount: 1 },
        { sceneId: at(1), what: "feeding someone you rescued", amount: 1 },
        { sceneId: last, what: "a rest before the last push", amount: 1 },
      ],
      whenEmpty:
        "Everyone is exhausted: each challenge needs one extra success.",
    },
    {
      id: "light",
      name: "Light and warmth",
      start: 4,
      unit: "an hour of fuel or lamp oil",
      spends: [
        { sceneId: at(0), what: "the night crossing", amount: 1 },
        { sceneId: at(1), what: "a hazard that costs fuel", amount: 1 },
        { sceneId: last, what: "the final approach", amount: 1 },
      ],
      whenEmpty: "The party is left in the cold and dark; hazards hit harder.",
    },
  ];
}
