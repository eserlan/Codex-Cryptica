/**
 * Public Rumour generator — a lightweight companion to the Quest Hook
 * Generator (#2732). Where a quest hook is something the party could go and
 * do, a rumour is something people are saying: it must name a concrete,
 * pursuable lead (a site, NPC, faction, or item), but stays deliberately
 * light and never balloons into a full quest structure.
 *
 * Default output is a d6 table of exactly 6 rumours with a fixed hidden
 * truth distribution: 4 essentially true, 1 exaggeration (true core,
 * distorted detail), 1 dangerous misconception (plausible but materially
 * wrong). Truth status must never appear in player-facing text — it only
 * shows up in the GM-only `lore` field.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { formatCampaignContextBlock } from "./campaign-context";
import {
  type RumourReality,
  type RumourSeed,
  type Subject,
  rumourConfig,
  seedsForFocus,
} from "./public-rumour-constants";

export type { RumourReality } from "./public-rumour-constants";
export { rumourConfig, seedsForFocus } from "./public-rumour-constants";

export interface RumourGeneratorOptions {
  genre?: string;
  tone?: string;
  dangerLevel?: string;
  subjectFocus?: string;
  locationContext?: string;
  campaignContext?: string;
}

export interface ResolvedRumourOptions {
  genre: string;
  tone: string;
  dangerLevel: string;
  subjectFocus: string;
  locationContext: string;
  campaignContext: string;
}

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export function resolveRumour(
  options: RumourGeneratorOptions = {},
): ResolvedRumourOptions {
  return {
    genre: text(options.genre) || rumourConfig.genres[0],
    tone: text(options.tone) || rumourConfig.tones[0],
    dangerLevel: text(options.dangerLevel) || rumourConfig.dangerLevels[0],
    subjectFocus: text(options.subjectFocus) || rumourConfig.subjects[0],
    locationContext: text(options.locationContext),
    campaignContext: text(options.campaignContext),
  };
}

export interface RumourPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedRumourOptions;
}

const CONTENT_HEADINGS = Array.from(
  { length: 6 },
  (_, i) => `### Rumour ${i + 1}`,
);
const LORE_HEADINGS = [
  "### At a Glance",
  ...CONTENT_HEADINGS.map((h) =>
    h.replace("### Rumour", "### GM Notes — Rumour"),
  ),
];

function render(
  resolved: ResolvedRumourOptions,
  title: string,
  content: string,
  lore: string,
  summary?: string,
): PublicGeneratorOutput {
  return {
    type: "note",
    kind: "rumour",
    title,
    summary:
      summary ||
      `Six local rumours for ${resolved.locationContext || "a settlement, tavern, or social hub"} — every one names a concrete lead, and exactly one is a dangerous misconception.`,
    content,
    lore,
    labels: [
      "rumour-generator",
      "local-rumours",
      resolved.genre.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      "imported-draft",
    ],
    status: "active",
  };
}

export function buildRumourPrompt(
  options: RumourGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): RumourPrompt {
  const resolved = resolveRumour(options);
  const truthOrder = pickRandomItems(
    ["exaggeration", "misconception", "true", "true", "true", "true"],
    6,
    rng,
  );

  const systemInstruction = `You are an expert tabletop RPG rumour-mill writer. Create six short, table-ready local rumours for a ${resolved.genre} setting. A rumour is NOT a quest hook: it presents something people are saying, not something the party is explicitly sent to do. Every rumour must still name at least one specific, pursuable lead — a named site, NPC, faction, or item the players can seek out, question, visit, inspect, follow, steal, or protect. Never write vague, unnamed danger ("strange things are happening"). Keep player-facing text free of any hint about which rumours are true, exaggerated, or false. Return only valid JSON.`;

  const userMessage = `Generate a d6 table of 6 local rumours in JSON format.
Options:
- Genre: ${resolved.genre}
- Tone: ${resolved.tone}
- Danger level: ${resolved.dangerLevel}
- Subject focus: ${resolved.subjectFocus}${resolved.locationContext ? `\n- Location / settlement context: ${resolved.locationContext}` : ""}
${formatCampaignContextBlock(resolved.campaignContext)}
Hidden truth distribution (assign to the six rumours in this exact order, do not reveal it to players): ${truthOrder.join(", ")}.
- "true" rumours: the core claim is reliable; details may be incomplete.
- "exaggeration": the underlying claim is true, but distorted — investigating it should reveal an unexpected complication tied to the distortion.
- "misconception": plausible-sounding gossip that is materially wrong and dangerous if the party acts on it at face value.

If the subject focus is not "Balanced Mix", bias most (not all) of the six rumours toward that subject while still covering a mix of subjects overall — avoid six variations on the same threat.

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A short evocative title for this batch of rumours (e.g. a place or night it was overheard)",
  "content": "Player-facing markdown using exactly six '### Rumour 1' through '### Rumour 6' headings in order. Under each heading include three bullets: '- **Rumour**: ...' (the read-aloud gossip line), '- **Lead**: ...' (the concrete named site/NPC/faction/item to pursue), and '- **Source**: ...' (who or where it was heard, drawn from tavern regulars, market traders, shrine pilgrims, guards, children, caravaners, dockworkers, drunks, minor nobles, or guild members). Never mention truth status here.",
  "lore": "GM-only markdown starting with '### At a Glance' (genre, tone, danger level bullets), then exactly six '### GM Notes — Rumour 1' through '### GM Notes — Rumour 6' headings matching the content numbering, each with three bullets: '- **Reality**: essentially true | exaggeration | dangerous misconception', '- **What's Actually Happening**: 1-2 concise sentences', and '- **If Investigated**: a lightweight discovery, complication, or consequence'. Do not add objectives, rewards, antagonist stat blocks, or encounter beats — keep this lighter than a full quest.",
  "labels": ["rumour-generator", "local-rumours", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return { systemInstruction, userMessage, resolved };
}

export function parseRumourResponse(
  text: string,
  resolved: ResolvedRumourOptions = resolveRumour(),
): PublicGeneratorOutput {
  const data = parseFencedJson<Record<string, unknown>>(text);
  const content = typeof data.content === "string" ? data.content : "";
  const lore = typeof data.lore === "string" ? data.lore : "";
  const contentRumourCount = (content.match(/^### Rumour \d+/gm) ?? []).length;
  const loreRumourCount = (lore.match(/^### GM Notes — Rumour \d+/gm) ?? [])
    .length;
  if (
    !content ||
    !lore ||
    contentRumourCount !== 6 ||
    loreRumourCount !== 6 ||
    !CONTENT_HEADINGS.every((heading) => content.includes(heading)) ||
    !LORE_HEADINGS.every((heading) => lore.includes(heading))
  ) {
    throw new Error(
      "Rumour response must contain exactly the required d6 sections.",
    );
  }
  return render(
    resolved,
    typeof data.title === "string" && data.title
      ? data.title
      : "Word Around Town",
    content,
    lore,
    typeof data.summary === "string" ? data.summary : undefined,
  );
}

export function generateRumourLocal(
  options: RumourGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveRumour(options);
  const pool = seedsForFocus(resolved.subjectFocus);
  const shuffledPool = pickRandomItems(pool, pool.length, rng);

  // Pick 6 seeds. The requested subjectFocus is guaranteed both of its slots
  // first (the pool deliberately duplicates it), then every other subject
  // fills the remaining slots at most once each, for a mix.
  const seenCounts = new Map<Subject, number>();
  const chosen: RumourSeed[] = [];
  for (const seed of shuffledPool) {
    if (chosen.length >= 6) break;
    if (seed.subject !== resolved.subjectFocus) continue;
    const count = seenCounts.get(seed.subject) ?? 0;
    if (count >= 2) continue;
    seenCounts.set(seed.subject, count + 1);
    chosen.push(seed);
  }
  for (const seed of shuffledPool) {
    if (chosen.length >= 6) break;
    const count = seenCounts.get(seed.subject) ?? 0;
    if (count >= 1) continue;
    seenCounts.set(seed.subject, count + 1);
    chosen.push(seed);
  }
  while (chosen.length < 6) {
    chosen.push(pickFrom(pool, rng));
  }
  // Re-shuffle final order so a focused subject isn't always rumours 1 and 2.
  const orderedChosen = pickRandomItems(chosen, chosen.length, rng);

  const truthOrder = pickRandomItems(
    [
      "exaggeration",
      "misconception",
      "true",
      "true",
      "true",
      "true",
    ] as RumourReality[],
    6,
    rng,
  );

  const entries = orderedChosen.map((seed, i) => {
    const built = seed.build(rng, resolved.locationContext);
    const reality = truthOrder[i];
    return { ...built, reality, truthInfo: built.truth[reality] };
  });

  const content = entries
    .map(
      (entry, i) =>
        `### Rumour ${i + 1}\n- **Rumour**: ${entry.rumour}\n- **Lead**: ${entry.lead}\n- **Source**: ${entry.source}`,
    )
    .join("\n\n");

  const realityLabel: Record<RumourReality, string> = {
    true: "essentially true",
    exaggeration: "exaggeration",
    misconception: "dangerous misconception",
  };

  const lore = [
    "### At a Glance",
    `- **Genre**: ${resolved.genre}`,
    `- **Tone**: ${resolved.tone}`,
    `- **Danger Level**: ${resolved.dangerLevel}`,
    "",
    entries
      .map(
        (entry, i) =>
          `### GM Notes — Rumour ${i + 1}\n- **Reality**: ${realityLabel[entry.reality]}\n- **What's Actually Happening**: ${entry.truthInfo.whatsHappening}\n- **If Investigated**: ${entry.truthInfo.ifInvestigated}`,
      )
      .join("\n\n"),
  ].join("\n");

  return render(
    resolved,
    `Word Around ${resolved.locationContext || "Town"}`,
    content,
    lore,
  );
}
