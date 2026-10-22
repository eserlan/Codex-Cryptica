/** Prompts for the staged dungeon workflow; fixed plans and context stay authoritative. */
import {
  avoidNamesExcludingContext,
  formatCampaignContextBlock,
} from "./campaign-context";
import { asArray as arr, asRecord as rec } from "./llm-response-utils";
import { text } from "./dungeon-stage-data";
import {
  formatDungeonSeeds,
  type DungeonGeneratorOptions,
  type DungeonJson,
  type ResolvedDungeon,
} from "./public-dungeon";
import { GENRE_HINTS } from "./public-dungeon-constants";
import { NAME_BAN_PROMPT } from "./public-npc";
import type { JsonObject as Json } from "./staged-runtime";

export function systemFor(resolved: ResolvedDungeon, stage: string): string {
  return `You are a master worldbuilder and TTRPG dungeon designer writing an original ${resolved.genre} delve a GM can run at the table. You write it in stages; this is the ${stage} stage.

Everything already established in earlier stages is authoritative: do not change it, rename it, or contradict it. The fixed structure (sector ids, each sector's stocked-content type, exactly two factions with their assigned drives) is honoured exactly. Be specific to this delve, not generic to the genre. Respect any campaign context the user supplied; it outranks the creative seeds.

Return ONLY a single valid JSON object matching the requested schema. ${NAME_BAN_PROMPT}`;
}

function settingBlock(
  options: DungeonGeneratorOptions,
  resolved: ResolvedDungeon,
  contextPrefix = "",
): string {
  const hint =
    GENRE_HINTS[resolved.genre] ||
    GENRE_HINTS["Classic Fantasy"] ||
    GENRE_HINTS["Fantasy"] ||
    "";
  return `${contextPrefix}Setting Context:
- Active Theme / Genre: ${resolved.genre} (${hint})
- Original Purpose: ${resolved.purpose}
- Current State: ${resolved.currentState}
- Scale: ${resolved.scale}
${formatCampaignContextBlock(options.campaignContext)}
${options.instruction ? `- Special Instructions: ${options.instruction}` : ""}`;
}

/** The fixed sector connections, labelled with names once sectors have them. */
function layoutBlock(
  resolved: ResolvedDungeon,
  names: readonly string[] = [],
): string {
  const label = (i: number) => {
    const id = resolved.sectors[i]?.id ?? `sector-${i + 1}`;
    return names[i] ? `${id} (${names[i]})` : id;
  };
  const lines = resolved.sectorEdges.map(
    (e) => `- ${label(e.from)} ↔ ${label(e.to)}, via ${e.via}`,
  );
  return `Layout (fixed; these are the only connections between sectors):
${lines.join("\n")}`;
}

export function foundationMessage(
  options: DungeonGeneratorOptions,
  resolved: ResolvedDungeon,
  contextPrefix?: string,
): string {
  const plan = resolved.sectors.map((s) => s.id);
  return `Stage 1 of 3: lay the foundation of this delve.

${settingBlock(options, resolved, contextPrefix)}

${formatDungeonSeeds(
  resolved,
  avoidNamesExcludingContext(options.avoidNames ?? [], options.campaignContext),
  options.avoidTraits ?? [],
)}

Do not write sector names, hazards, treasures or factions yet. Later stages write those from what you establish here.

Required JSON schema:
{
  "title": "Evocative, specific name for this delve.",
  "summary": "1-2 sentence premise of why this location is interesting.",
  "throughline": "ONE sentence: who built it, what went wrong, and how that leaves it in the Current State above.",
  "history": "Who built it, what for, and what went wrong; must end where the throughline ends. Say how the thing that went wrong actually happened (the mechanism, not only that it failed), and do not restate the throughline or summary. Treasures later must fit who built it.",
  "currentState": "How it functions today, consistent with '${resolved.currentState}'.",
  "signatureFeature": "One distinctive landmark or phenomenon that defines this delve.",
  "secret": "The hidden truth at the heart of the delve, connected to the history.",
  "sectorBriefs": [
    // EXACTLY ${plan.length} entries, ids copied exactly, in this order: ${plan.join(", ")}
    { "id": "sector-1", "brief": "One sentence: this area's role in the delve and how it connects to the history or secret." }
  ]
}`;
}

export function sectorsMessage(
  options: DungeonGeneratorOptions,
  resolved: ResolvedDungeon,
  foundation: Json,
  contextPrefix?: string,
): string {
  const plan = resolved.sectors
    .map((s) => `  ${s.id}: ${s.stockType ?? "Lore"}`)
    .join("\n");
  return `Stage 2 of 3: expand the sector briefs into the delve's geography and contents.

${settingBlock(options, resolved, contextPrefix)}

Established foundation (do not change):
${JSON.stringify(foundation, null, 2)}

Sector plan (id: stocked-content type), fixed:
${plan}

${layoutBlock(resolved)}

Do not add any sector beyond these. Where the signature feature or the secret reaches into a sector, say how it shows there, so the place reads as one connected structure. Do not write factions yet; they will be written against what you write here, so make the contents specific enough to want, guard or fear.

Required JSON schema:
{
  "sectors": [
    // EXACTLY ${resolved.sectors.length} entries, in plan order, "id" copied exactly
    { "id": "sector-1", "name": "Your name for this area — no leading number, no 'Sector N:' prefix", "description": "2-3 sentences of vivid, specific description that follows its brief.", "stockDetail": "One concrete thing here matching its stock type: a creature for Monster, findable evidence for Lore, a landmark for Special, a danger for Trap. Unique across sectors." }
  ],
  "hazards": ["2-3 distinct dangers, one per entry"],
  "treasures": ["2-3 distinct finds, one per entry, fitting who built this delve and what it was for"],
  "hooks": ["2-3 reasons a party would come here or rumours about it, one per entry"]
}`;
}

export function factionsMessage(
  options: DungeonGeneratorOptions,
  resolved: ResolvedDungeon,
  established: Json,
  contextPrefix?: string,
): string {
  const drives = resolved.factions
    .map((f, i) => `  Faction ${i + 1}: ${f.drive}`)
    .join("\n");
  const ids = resolved.sectors.map((s) => s.id).join(", ");
  const names = arr(established.sectors).map((s) => text(rec(s).name));
  const one = (i: number) =>
    `{ "name": "An invented name — never 'Faction A', 'First Faction' or similar.", "identity": "One plain sentence: what these people are.", "virtue": "One-word virtue", "vice": "One-word vice", "goal": "Concrete, present-tense; achievable using only the established sectors and contents, and not something it already holds.", "drive": "${resolved.factions[i]?.drive ?? ""}", "obstacle": "What blocks it, drawn from an established sector, hazard, treasure or the other faction. One sentence.", "origin": "How it became connected to this delve, tied to the history.", "belief": "What it believes about the delve, interpreting established facts.", "territorySectorIds": ["one or more of: ${ids}"], "presence": [{ "sectorId": "each territory id, once", "detail": "One sentence: what this faction has done to that sector — a camp, barricade, shrine, ritual preparations, cataloguing, damage — visible to anyone who walks in." }], "strength": "Its real advantage; not the territory itself, and it must not cancel the obstacle.", "leader": { "name": "Character name", "description": "One sentence." }, "notable": { "name": "A different character name", "description": "One sentence." }, "relationship": "This faction's own strategy toward the other faction; not a repeat of the standoff." }`;
  return `Stage 3 of 3: write the factions against the delve as it now exists.

${settingBlock(options, resolved, contextPrefix)}

Established delve (do not change, and do not add to it):
${JSON.stringify(established, null, 2)}

Fixed drives (each faction keeps its own):
${drives}

${layoutBlock(resolved, names)}

Rules:
- Territory is one or more of the sector ids above, never a place name.
- Territory follows the layout. If a faction holds sectors that only connect through ground it does not hold, its strength, obstacle or relationship must say how it crosses or holds out (a smuggling route through an established hazard, a truce, an isolated enclave); otherwise give it connected sectors.
- The delve is occupied now. For every sector in a faction's territory, presence says what that faction has changed there.
- Factions animate the delve; they do not extend it. Small local dressing inside a held sector (a barricade, a camp, a patrol) is fine, but do not invent a new chamber, vault, archive, route, entrance, artifact or unexplained power.
- Goal, obstacle, belief and relationship must refer to sectors, hazards, treasures or the secret listed above.
- A faction must not seek something its own territory already holds (check the stockDetail of its sectors), unless the text says why it is out of reach.
- Drive explains why the faction wants its goal and fits its identity.

Required JSON schema:
{
  "factionSituation": "2-3 sentences naming both factions: what each wants, why that collides, why neither has won, what makes it unstable. It must match their actual goals.",
  "factions": [
    ${one(0)},
    ${one(1)}
  ]
}`;
}

export const REVIEW_SYSTEM = `You check a finished TTRPG dungeon write-up for problems a GM would trip over at the table. You do not rewrite it and you do not suggest improvements to prose that works. Return ONLY a single valid JSON object.`;

/** Marks the review message, so tests and logs can tell it from the repair. */
export const DUNGEON_REVIEW_MARKER = "Coherence review of a finished delve.";

export function reviewMessage(
  d: DungeonJson,
  resolved: ResolvedDungeon,
  contextPrefix = "",
): string {
  return `${contextPrefix}${DUNGEON_REVIEW_MARKER}

${layoutBlock(
  resolved,
  d.sectors.map((s) => s.name),
)}

Delve:
${JSON.stringify(d, null, 2)}

List only real problems, at most 5, from these kinds:
- History and current state cannot both be true, or the secret contradicts the history.
- The central event (what went wrong) has no stated mechanism: it says that something happened but never how.
- The place reads as undisturbed although factions hold sectors in it, or a held sector shows no sign of who holds it.
- A faction cannot physically reach its own territory or goal along the layout above, and nothing says how it manages.
- A field restates another field instead of adding to it.

Campaign context above, if any, is established truth: something it explains is not a problem.

Each problem names the fields involved and says what is wrong in one sentence. If there are none, return an empty list.

Required JSON schema:
{ "issues": ["..."] }`;
}
