import {
  type CampaignGeneratorDefinition,
  type GeneratedDraft,
  type GeneratorId,
  type GeneratorOutput,
  type GeneratorRunRequest,
  SUPPORTED_GENERATOR_IDS,
  UnsupportedGeneratorError,
} from "./campaign-generator-types";
import { generateShipLocal } from "./public-ship";
import {
  buildLanguagePrompt,
  generateLanguageLocal,
  languageConfig,
} from "./public-language";
import { renderLanguageProfilePrompt } from "./language-profile";
import { generateNewsSheetLocal, newsSheetConfig } from "./public-news-sheet";
import {
  buildDungeonPrompt,
  generateDungeonLocal,
  dungeonConfig,
  type DungeonGeneratorOptions,
} from "./public-dungeon";
import {
  buildAdventurePrompt,
  generateAdventureLocal,
  adventureConfig,
  type AdventureGeneratorOptions,
} from "./public-adventure";
import {
  buildWorldPrompt,
  generateWorldLocal,
  type WorldGeneratorOptions,
  worldConfig,
} from "./public-world";

/**
 * Generator id -> default vault category id.
 *
 * The generator id is a content concept and is NOT the vault category. Only
 * `faction` matches by name; the rest map to distinct categories.
 */
export const GENERATOR_ENTITY_TYPE: Record<GeneratorId, string> = {
  npc: "character",
  faction: "faction",
  settlement: "location",
  "magic-item": "item",
  event: "event",
  ship: "location",
  language: "note",
  "news-sheet": "note",
  dungeon: "location",
  adventure: "note",
  world: "location",
  "council-vote": "note",
};

/** Fallback category used when a mapped category is absent from the campaign. */
export const FALLBACK_CATEGORY = "note";

/**
 * Resolve the vault category for a generator against the campaign's available
 * categories. Falls back to `note` when present, otherwise the first available
 * category, so generation never produces an unknown entity type.
 */
export function resolveEntityType(
  generatorId: GeneratorId,
  availableCategoryIds?: string[],
): string {
  const mapped = GENERATOR_ENTITY_TYPE[generatorId];
  if (!availableCategoryIds || availableCategoryIds.length === 0) return mapped;
  if (availableCategoryIds.includes(mapped)) return mapped;
  if (availableCategoryIds.includes(FALLBACK_CATEGORY))
    return FALLBACK_CATEGORY;
  return availableCategoryIds[0];
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function optionString(
  request: GeneratorRunRequest,
  key: string,
  fallback: string,
): string {
  const value = request.options[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function dungeonOptions(request: GeneratorRunRequest): DungeonGeneratorOptions {
  return {
    themeId: request.themeId || optionString(request, "themeId", "fantasy"),
    purpose: optionString(request, "purpose", ""),
    currentState: optionString(
      request,
      "currentState",
      optionString(request, "status", ""),
    ),
    scale: optionString(request, "scale", ""),
    instruction: request.instructions,
    avoidNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  };
}

/**
 * Map raw generator output into a transient draft, applying the resolved vault
 * category and preserving template/relationship context and unmatched details.
 */
function mapOutputToDraft(
  generatorId: GeneratorId,
): CampaignGeneratorDefinition["mapOutputToDraft"] {
  return (
    output: GeneratorOutput,
    request: GeneratorRunRequest,
  ): GeneratedDraft => {
    const availableIds = request.vaultContext?.categoryLabels?.map((c) => c.id);
    return {
      title: output.title,
      entityType: resolveEntityType(generatorId, availableIds),
      summary: output.summary,
      lore: output.lore,
      content: output.content,
      labels: [...output.labels],
      sourceGeneratorId: generatorId,
      sourceEntityId: request.sourceEntityId,
      relationshipLabel: request.relationshipLabel,
      connections: output.connections ? [...output.connections] : undefined,
      templateOutline: request.vaultContext?.templateOutline,
      templateApplied: Boolean(
        request.vaultContext?.applyTemplate &&
        request.vaultContext?.templateOutline,
      ),
      unmappedDetails: output.unmappedDetails,
      languageProfile: output.languageProfile,
      languageProfileVersion: output.languageProfileVersion,
      primaryLanguageId: request.vaultContext?.selectedLanguage?.id,
      primaryLanguageTitle: request.vaultContext?.selectedLanguage?.title,
    };
  };
}

// ---------------------------------------------------------------------------
// Shared prompt helpers
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTION =
  "You are a master tabletop RPG game master and worldbuilder. Generate campaign content, grounded in the provided world context, that a GM can use directly at the table. " +
  "Quality bar: write concrete, sensory, specific detail; show through action and example rather than abstract description; give every entity at least one secret or complication and one actionable hook the players can pursue. " +
  'Avoid clichés ("ancient evil", "the chosen one", "a shadowy figure"), purple prose, filler adjectives, modern idioms, and restating the prompt back to the user. ' +
  "Keep the result internally consistent: names, facts, dates, motivations, and relationships must agree across every field and section, with no self-contradictions. " +
  "Return ONLY valid JSON (a single object) with no markdown code fences. In string values, escape newlines as \\n.";

const OUTPUT_SCHEMA = `{
  "title": "string — the entity's name",
  "summary": "string — one vivid sentence",
  "lore": "string — markdown using the requested section headings",
  "labels": ["string — short thematic tags"],
  "connections": [
    { "targetTitle": "string — EXACT title of an entity from the world context above", "relationship": "string — short label, e.g. ally, rival, member of, located in, caused by" }
  ]
}`;

function vaultContextBlock(request: GeneratorRunRequest): string {
  if (request.interaction) return "";
  const ctx = request.vaultContext;
  if (!ctx) return "";
  const lines: string[] = [];
  if (ctx.themeName && ctx.themeId !== "workspace") {
    lines.push(`World Theme: ${ctx.themeName}`);
  }
  if (ctx.currentDate) {
    lines.push(
      `Current campaign date: ${ctx.currentDate}. Place the content at this point in the timeline — no anachronisms and no references to events that have not yet happened.`,
    );
  }
  if (ctx.sourceEntity) {
    const src = ctx.sourceEntity;
    lines.push(
      `\nSource Entity (generate something related to this):\n- ${src.title} (${src.type}): ${src.contentExcerpt || ""}`,
    );
    if (src.loreExcerpt) {
      lines.push(`  Lore: ${src.loreExcerpt}`);
    }
  }
  if (ctx.neighbors.length) {
    lines.push("\nConnected Entities (world context):");
    for (const n of ctx.neighbors) {
      lines.push(
        `- ${n.title} (${n.type}): ${n.contentExcerpt || n.loreExcerpt || ""}`,
      );
    }
  }
  if (ctx.selectedLanguage) {
    const language = ctx.selectedLanguage;
    lines.push(`\nPrimary Language — ${language.title}:`);
    if (language.languageProfile) {
      lines.push(renderLanguageProfilePrompt(language.languageProfile));
    } else {
      lines.push(
        `Legacy readable notes: ${language.loreExcerpt || language.contentExcerpt || ""}`,
      );
    }
    lines.push(
      "Generated names and terminology must visibly follow the supplied rules and examples. Do not invent missing language rules.",
    );
  }
  return lines.join("\n");
}

/**
 * Positive world grounding: a sample of existing vault entities so the model
 * matches the established tone and stays consistent with the campaign. Distinct
 * from the source/neighbor context and the name ban list.
 */
function worldBlock(request: GeneratorRunRequest): string {
  if (request.interaction) return "";
  const ctx = request.vaultContext;
  if (!ctx?.worldSample?.length) return "";
  const lines = [
    "\nExisting entities in this world (match their tone and stay consistent — do not duplicate or contradict them):",
  ];
  for (const e of ctx.worldSample) {
    lines.push(
      `- ${e.title} (${e.type}): ${e.contentExcerpt || e.loreExcerpt || ""}`,
    );
  }
  return lines.join("\n");
}

function optionsBlock(request: GeneratorRunRequest): string {
  const entries = Object.entries(request.options).filter(([, v]) => v !== "");
  if (!entries.length) return "";
  return (
    "\nPreferences:\n" + entries.map(([k, v]) => `- ${k}: ${v}`).join("\n")
  );
}

function instructionsBlock(request: GeneratorRunRequest): string {
  const inst = request.instructions?.trim();
  if (!inst) return "";
  return `\n[HIGHEST PRIORITY — User instructions, override defaults]\n${inst}\nThe entity you generate MUST directly depict what this instruction describes. Use the world context below only as supporting background — never substitute a different, better-documented event or subject for the one requested.\n`;
}

function bannedNamesBlock(request: GeneratorRunRequest): string {
  if (request.interaction) return "";
  const ctx = request.vaultContext;
  const all = [...(ctx?.bannedNames ?? []), ...(ctx?.existingTitles ?? [])];
  if (!all.length) return "";
  return `\nDo NOT use any of these names, or hyphenated/compound variations of them (e.g. if "Vane" is listed, do not use "Vane-Smithe"): ${all.join(", ")}`;
}

/**
 * True when a generated title collides with a banned name. Matches whole tokens
 * case-insensitively (splitting on spaces, hyphens, punctuation, and accents
 * preserved) so derivatives like "Vane-Smithe" are caught for a banned "Vane",
 * while substrings inside a larger word ("Vanessa") are not.
 */
export function isTitleBanned(
  title: string,
  banned: Iterable<string>,
): boolean {
  const normalize = (s: string) =>
    ` ${s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()} `;
  const haystack = normalize(title);
  for (const name of banned) {
    const needle = normalize(name).trim();
    if (needle && haystack.includes(` ${needle} `)) return true;
  }
  return false;
}

/**
 * Instruct the model to keep the generated name culturally consistent with the
 * world — deriving its linguistic style from the example entities and source
 * context (e.g. Magyar-flavoured names for a Magyar-inspired culture) rather
 * than defaulting to generic, culture-neutral fantasy names.
 */
function namingBlock(request: GeneratorRunRequest): string {
  const ctx = request.vaultContext;
  const hasExamples =
    !!ctx?.sourceEntity || !!ctx?.neighbors.length || !!ctx?.worldSample.length;
  let basis = hasExamples
    ? "Infer the naming style from the example entities and source context above"
    : "Use a consistent naming style appropriate to the world theme";
  if (ctx?.selectedLanguage) {
    basis +=
      " and treat the explicitly selected Primary Language as authoritative for names and terminology";
  }
  return `\nName the entity to match the established naming conventions and cultural/linguistic flavour of this world. ${basis}; do not default to generic, culture-neutral fantasy names.`;
}

/**
 * When a template outline is supplied, instruct the model to shape the "lore"
 * field to match it — mirroring the markdown template a manually-created entity
 * of this type would receive.
 */
function templateBlock(request: GeneratorRunRequest): string {
  if (request.interaction) return "";
  const ctx = request.vaultContext;
  if (!ctx?.applyTemplate || !ctx.templateOutline) return "";
  return `\nStructure the "lore" field to follow this template, keeping its markdown headings and filling every section with generated content:\n${ctx.templateOutline}\n`;
}

/**
 * Require the model to weave the new entity into the world, and to fill the
 * "connections" array only with entities that actually appear in the context.
 */
function groundingNote(request: GeneratorRunRequest): string {
  const ctx = request.vaultContext;
  const hasWorld =
    !!ctx?.sourceEntity || !!ctx?.neighbors.length || !!ctx?.worldSample.length;
  if (!hasWorld) {
    return `\nThis world has no existing entities yet — leave "connections" as an empty array.`;
  }
  return `\nGround the entity in the world: weave in at least one entity named in the context above, reusing its exact name and the world's established terminology. In "connections", reference only entities that appear in the context above, using their exact titles; omit anything uncertain (an empty array is fine — never invent a target).`;
}

/**
 * Lore guidance that defers to the resolved template when one is present (so the
 * model follows the template's sections rather than a competing generic
 * checklist), and otherwise supplies a per-generator checklist.
 */
function loreGuidance(request: GeneratorRunRequest, builtin: string): string {
  const ctx = request.vaultContext;
  if (ctx?.applyTemplate && ctx.templateOutline) {
    return `Fill every section of the template above with specific, evocative content; keep its exact markdown headings.`;
  }
  return `The "lore" field should include: ${builtin}. Use clear markdown headings.`;
}

/**
 * Compact, illustrative few-shot examples — one per generator — that set the
 * depth, tone, and JSON shape. Newlines inside "lore" are escaped so the model
 * is reinforced to emit valid JSON.
 */
const EXEMPLARS: Record<GeneratorId, string> = {
  npc: `{"title":"Ottavia Brenn","summary":"A one-eyed dockmaster who trades secrets faster than cargo.","lore":"## Who She Is\\nOttavia keeps the tide-ledgers of a silt-choked harbour, and nothing crosses the wharf without her mark.\\n## Secret\\nShe quietly forged three years of customs records to bury a smuggling debt that would hang her brother.\\n## Hook\\nShe offers the party safe berth — if they retrieve a sealed manifest from a rival's strongbox first.","labels":["Dockmaster","Information Broker"],"connections":[{"targetTitle":"Harbour Authority","relationship":"member of"}]}`,
  faction: `{"title":"The Salt Concord","summary":"A merchant pact that rules the coast through debt rather than swords.","lore":"## What They Control\\nEvery harbour crane and grain silo within a week's sail answers to their ledgers.\\n## Internal Conflict\\nThe old founding houses want stability; a rising faction wants to call in every debt at once.\\n## Hook\\nThey hire the party to recover a defaulting captain — alive, because dead men pay nothing.","labels":["Merchant Pact","Coastal Power"],"connections":[{"targetTitle":"Ottavia Brenn","relationship":"employs"}]}`,
  settlement: `{"title":"Greywick Landing","summary":"A half-sunk port town that thrives on what the tide drags back.","lore":"## Points of Interest\\nThe Drowned Market trades only at low tide; the rest of the day it is waist-deep in brine.\\n## Power Structure\\nA harbourmaster rules by controlling the only dry granary.\\n## Hook\\nA ship thought lost for a decade has drifted back into the bay — crewed, and silent.","labels":["Port Town","Coastal"],"connections":[{"targetTitle":"The Salt Concord","relationship":"controlled by"}]}`,
  "magic-item": `{"title":"The Ledger of Brine","summary":"A waterlogged tome that records debts no one remembers owing.","lore":"## History\\nKept by a drowned customs house, its pages re-ink themselves each tide.\\n## Power\\nName a debtor and the book reveals what they truly owe — and to whom.\\n## Cost\\nEach reading adds the reader's own name to a growing column at the back.","labels":["Cursed Tome","Uncommon"],"connections":[{"targetTitle":"Greywick Landing","relationship":"located in"}]}`,
  event: `{"title":"The Long Low Tide","summary":"The season the sea withdrew a mile and would not return.","lore":"## Summary\\nFor forty days the bay emptied, stranding ships and exposing what the water had hidden.\\n## Causes\\nNo one agrees — a broken pact, a sleeping leviathan, a curse called in.\\n## Consequences\\nSalvage made paupers rich and drowned the old harbour law in disputes.\\n## Hook\\nThe tide is beginning to recede again, and the old salvagers are sharpening their hooks.","labels":["Disaster","Maritime"],"connections":[{"targetTitle":"Greywick Landing","relationship":"struck"}]}`,
  ship: `{"title":"CSV Meridian","summary":"A worn freighter that earns its living asking no questions — and keeping no honest records.","lore":"## Who Controls It\\nIndependent in name; in practice, whoever can pay the docking fees this month.\\n## Complication\\nThe cargo manifest lists machine parts. The hold contains neither machines nor parts.\\n## Secret\\nThe ship was declared lost seven years ago. The captain has a very good reason for keeping it that way.\\n## Hook\\nThe Meridian is the only vessel in port that will run this route — but the crew wants something in return.","labels":["Freighter","Sci-Fi","Independent"],"connections":[{"targetTitle":"Harbour Authority","relationship":"flagged by"}]}`,
  "news-sheet": `{"title":"The Harbourside Ledger — Issue 214","summary":"A dockside broadsheet whose lead story about a warehouse fire carefully avoids naming the warehouse's owner.","lore":"# The Harbourside Ledger\\n*All the truth the tide brings in — Issue No. 214*\\n\\n## FIRE ON THE SALT ROW: 'AN ACCIDENT', SAYS EVERYONE PAID TO SAY SO\\nThe grain warehouse on Salt Row burned through the night despite standing ten paces from the harbour. The watch calls it a lantern mishap. The night-loaders who fled the district before dawn were unavailable for comment.\\n\\n### Concord Announces Relief Levy\\nThe Salt Concord will fund rebuilding through a temporary levy on dock traffic. The levy has no announced end date.\\n\\n### Notices & Classifieds\\n- LOST: one ledger, water-stained, of sentimental value only. Generous reward. No questions.\\n- WANTED: strong backs for night work, discretion assumed.\\n\\n### Word on the Street\\n- The warehouse was empty when it burned — emptied two nights earlier, say the rats.\\n\\n## GM Notes\\n**The truth**: the fire concealed the theft of the grain reserve; the 'lost ledger' classified was placed by the clerk who falsified the inventory.\\n**Hooks**: the clerk will pay the party to recover the ledger before the Concord's auditors do; a night-loader who saw the carts is hiding in the Drowned Market.","labels":["broadsheet","harbour","handout"],"connections":[{"targetTitle":"The Salt Concord","relationship":"covers for"},{"targetTitle":"Greywick Landing","relationship":"published in"}]}`,
  language: `{"title":"Low-Speak","summary":"A guttural, whispered dialect used by miners and tunnel-diggers to communicate across echoing caverns.","content":"## Pronunciation & Phonology\\nLow-frequency clicks, soft whistles, and deep guttural stops that carry well through stone.\\n\\n## Cultural Role & Usage\\nSpoken in the deep galleries where torchlight is rationed; surface-folk who use it mark themselves as tunnel-kin.\\n\\n## Naming Conventions\\nNames are formed by compound roots relating to geological features or mineral properties.\\n\\n## Common Vocabulary & Word Bank\\n| Word | Pronunciation | English Meaning |\\n| --- | --- | --- |\\n| Vur | VOOR | Iron |\\n| Lith | LITH | Stone |\\n\\n## Sample Phrases\\n- *\\"Vur-Lith-Garon\\"* — (VOOR-lith-GAH-ron) — \\"Solid as iron\\"","lore":"### At a Glance\\n- **Genre / Setting**: Classic Fantasy\\n- **Tone**: Harsh & Consonant-heavy\\n- **Role**: Common Speech\\n- **Name Structure**: Compound Words\\n\\n### Example Names\\n- **Garon-Vur** — Iron Seeker (person)\\n- **Kael-Lith** — Stone Speaker (person)\\n\\n### At the Table\\n- Greet with a short falling whistle before speaking; skipping it reads as a threat.","labels":["dialect","underdark","conlang"],"connections":[]}`,
  dungeon: `{"title":"The Submerged Vault of Sunken Runes","summary":"An ancient flooded temple complex whose inner sanctum preserves an active celestial beacon.","lore":"## History & Original Purpose\\nOriginally built 800 years ago as a sacred dwarven sanctuary, the delve was abandoned during the Dragon War and subsequently flooded by subterranean rivers.\\n## Current State & Function\\nCurrently overrun by a desperate clan of Goblins utilizing ancient defense traps against an intruding Kobold mining party.\\n## Signature Feature\\nThe Levitating Sunstone: A massive radiant orb suspended over an inverted fountain pool, illuminating the entire central hall.\\n## Current Conflict\\nAn invading Kobold mining crew has broken into the lower sectors, sparking a turf war with the resident Goblin clan.\\n## Key Sectors & Layout\\n### Sector 1: The Guarded Gateway\\nFortified entry halls with collapse traps.\\n### Sector 2: The Deep Arcana Vault\\nSealed inner chamber housing warding circles.\\n## Inhabitants & Factions\\nA desperate clan of Goblins utilizing ancient defense traps against an intruding Kobold mining party.\\n## Central Secret / Boss Mystery\\nThe dungeon was not built as a tomb, but as a vault to lock away an elemental planar core.\\n## Hazards & Traps\\nPressure-plate needle traps laced with paralyzing wyvern venom.\\n## Treasures & Artifacts\\nA silver-hilted shortsword glowing with pale starlight near undead.\\n## Adventure Hooks & Rumours\\nA local scholar hires the party to retrieve an ancient astrological tablet from the ruins.","labels":["dungeon","location","fantasy","temple-shrine"],"connections":[]}`,
  adventure: `{"title":"The Witness Who Came Back","summary":"A dying informant has surfaced with evidence that implicates the city's most powerful magistrate — and she has three days to live.","lore":"## Initial Situation\\nA street physician treated a woman who should be dead — she was listed as a victim of last year's warehouse fire. She is carrying a sealed ledger and will only hand it to someone who can guarantee safe passage out of the city.\\n## Primary Objective & Pressure\\nGet the witness and the ledger to the provincial capital before the magistrate's agents locate her — the city gates close in 36 hours for the harvest festival.\\n## Key Locations\\n- **The Drowned Clinic** — A basement surgery below the harbour market; currently off the magistrate's map, but her colleagues will tell the wrong people.\\n- **The Salt Gate** — The only land route out; controlled by a guard captain who owes the magistrate a significant favour.\\n## Important NPCs & Factions\\n- **Mira Osal, the witness** — Survived by accident; wants to testify but is terrified of dying before she can.\\n- **Guard-Captain Deren** — Loyal to the magistrate, but only because the magistrate has his brother.\\n## Threats & Antagonists\\n- The magistrate's investigation office has already been tipped off; two plainclothes agents are watching the harbour market.\\n## Clues, Secrets & Discoveries\\n- The ledger names not just the magistrate but three provincial judges — the testimony is worth more than a conviction, which is why the magistrate wants it destroyed rather than suppressed.\\n## Complications & Escalating Pressures\\n- The physician who treated Mira has been taken in for questioning.\\n- The party's own credentials are in the magistrate's files from a prior interaction.\\n## Possible Outcomes\\n- The witness reaches the capital and testifies; the magistrate is arrested but the provincial judges are not named in the hearing.\\n- The ledger is lost or destroyed; Mira survives and her testimony alone changes nothing.\\n## Adventure Hooks\\n- The street physician sends word through a mutual contact: a patient is asking for people who handle difficult situations.\\n- A reward notice is posted for information on the whereabouts of a woman matching Mira's description.","labels":["adventure","event","investigation","fantasy"],"connections":[]}`,
  world: `{"title":"Khepri IV","summary":"A tidally locked desert world whose settlements cling to the narrow belt of dusk between a molten dayside and frozen night.","lore":"## World Profile\\nKhepri IV is a frontier world where every border follows the shade line.\\n## Climate & Geography\\nThe terminator belt migrates slowly, forcing towns to move their farms and roads with it.\\n## Gravity, Atmosphere & Biosphere\\nThe air is breathable but carries abrasive dust; native life burrows beneath the cooling surface.\\n## Settlements, Cultures & Factions\\nThe twilight cities share water through a fragile compact, while a solar-mining consortium wants to break it.\\n## Economy, Resources & Technology\\nMirror arrays harvest dayside energy, but only the cities can distribute it safely.\\n## Hazards & History\\nA failed weather-engineering project widened the dayside by three kilometres.\\n## Notable Locations\\n- The Moving Capital — a city on crawler treads.\\n- The Glass Sea — dunes fused by solar storms.\\n- The Cold Gate — the only protected route into the nightside.\\n## Mysteries & Conflicts\\nThe old climate array is receiving commands from somewhere beneath the Glass Sea.\\n## Adventure Hooks\\n- A water convoy has vanished beyond the Cold Gate.\\n- The consortium offers a fortune for a map of the buried array.\\n- A city refuses to move with the terminator, and its people need another solution.","labels":["world","desert-world","frontier","hard-sci-fi"],"connections":[]}`,
  "council-vote": `{"title":"The Vote for the Salt Road Levy","summary":"The five-seat Harbor Concord must approve emergency funding to reopen the Salt Road within three days, and a rival power is quietly buying votes to keep it closed.","lore":"## The Proposal\\nApprove a one-time levy on harbour traffic to fund the Salt Road's reopening, restoring the party's patron's trade route.\\n## Deadline & Stakes\\nThe Concord's charter requires the vote be called before the next new moon, three days away — if it fails, the levy cannot be raised again until next year and the patron's caravan company collapses.\\n## Voting Procedure\\nSimple majority of five seats; the Concord Chair may break a tie but cannot otherwise vote.\\n## Current Vote Estimate\\nTwo leaning in favour, one opposed, two undecided.\\n## Council Members\\n- **Ossian Thale, Concord Chair** (Traditionalist) — Public position: neutral pending evidence. True agenda: wants precedent and expert testimony before committing either way; privately resents being pressured by either side. Persuaded by: a formal audit of the Salt Road's prior revenue. Hook: his ledger-clerk owes a gambling debt to a smuggler who would trade information for its forgiveness.\\n- **Maren Koss** (Beleaguered Ally) — Public position: supports the levy. True agenda: sympathetic to the patron but her seat depends on a guild that opposes new taxes; she cannot vote her conscience without cover. Persuaded by: a face-saving amendment that frames the levy as guild-administered. Hook: needs the party to quietly resolve a debt her guild holds over her.\\n- **Devrin Ashcombe** (Villain's Toady) — Public position: opposed. True agenda: answers directly to the rival power funding the blockade and will not be moved by persuasion. Persuaded by: nothing — better exposed than courted. Hook: his correspondence with the rival's agent is hidden in his warehouse strongbox.\\n- **Yeva Sallow** (Greedy Broker) — Public position: undecided. True agenda: will vote however benefits her shipping contracts most, and is soliciting offers from both sides. Persuaded by: a better contract than the rival is offering. Hook: exposing her as an open vote-seller would cost her the seat, which is leverage in itself.\\n- **Brant Oduya** (Idealist) — Public position: supports the levy. True agenda: genuinely believes in the trade route but will withdraw support if the party's methods harm ordinary dockworkers. Persuaded by: proof the levy protects labourers, not just merchants. Hook: he is already drafting a labour-protection clause the party could champion for him.\\n## Antagonist Influence\\nEntrenched — the rival power has bought Devrin outright and is bidding for Yeva; expect a countermove within a day of any public progress toward a majority.\\n## Investigation Leads\\nThe harbourmaster's manifest shows unusual payments routed through Yeva's shipping contracts; Maren's guild hall keeps the ledger of her debt; Ossian's clerk drinks at the Salt Row taproom most nights.\\n## Possible Paths\\nSecure Ossian's audit and Brant's labour clause to win a clean majority of three, or expose Devrin and outbid the rival for Yeva to force a 3-2 vote without ever winning Ossian over.\\n## Follow-Up Hooks\\nWhichever way Yeva sells her vote, she will remember who paid better; exposing Devrin publicly earns the rival power's open enmity rather than its quiet one.","labels":["council-vote","political-intrigue","quest"],"connections":[{"targetTitle":"Harbor Concord","relationship":"governing body of"}]}`,
};

function exemplarBlock(id: GeneratorId): string {
  return `\nExample (illustrative only — match the world context above and do NOT reuse these names or details):\n${EXEMPLARS[id]}\n`;
}

export { SYSTEM_INSTRUCTION };

// ---------------------------------------------------------------------------
// Generator-specific prompt builders
// ---------------------------------------------------------------------------

/** Shared prompt context chain (everything before the task instruction). */
function contextChain(request: GeneratorRunRequest): string {
  return `${instructionsBlock(request)}${vaultContextBlock(request)}${worldBlock(request)}${optionsBlock(request)}${bannedNamesBlock(request)}${namingBlock(request)}${templateBlock(request)}`;
}

function npcPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign NPC. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock("npc")}${groundingNote(request)}
${loreGuidance(request, "who they are, what they want, a secret, and a first-scene hook")}`;
}

function factionPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign faction, guild, or organisation. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock("faction")}${groundingNote(request)}
${loreGuidance(request, "what they control, what they want, internal conflict, and an adventure hook")}`;
}

function settlementPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign settlement or location. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock("settlement")}${groundingNote(request)}
${loreGuidance(request, "points of interest, power structure, notable rumours, and a hook for the players")}`;
}

function magicItemPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign magic item or artefact. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock("magic-item")}${groundingNote(request)}
${loreGuidance(request, "item history, its power/effect, a side effect or curse, and how it might enter play")}`;
}

function eventPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign event — a historical or unfolding occurrence in the world. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock("event")}${groundingNote(request)}
Place it correctly within the world's timeline (consistent with any campaign date and existing events).
${loreGuidance(request, "what happened, its causes, who and what was involved, its consequences, and a hook for the players")}`;
}

function shipPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign ship — a traversable vehicle that functions as location, faction asset, and adventure seed. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock("ship")}${groundingNote(request)}
${loreGuidance(request, "the ship's role and condition, its owner and current mission, its dominant complication, its secret, its key zones, and at least two adventure hooks")}`;
}

function newsSheetPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate an in-world news sheet — a printable player handout of in-world headlines, short articles, rumours, classifieds, notices, and adverts, written in an in-world editorial voice and grounded in the world context. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock("news-sheet")}${groundingNote(request)}
The "title" is the publication name plus issue number or in-world date. Everything before the GM Notes section must be player-safe: report events the way the publication's owner and censor would allow, not the way they actually happened.
${loreGuidance(request, "a masthead line with publication name, tagline, and issue metadata; a lead headline story (3-5 sentences); 2-4 short secondary articles; a 'Notices & Classifieds' bullet list; a 'Word on the Street' rumour list; one advert or piece of propaganda; and a final '## GM Notes' section with the truth behind the stories and 1-4 adventure hooks")}`;
}

function languagePrompt(request: GeneratorRunRequest): string {
  const result = buildLanguagePrompt({
    genre: optionString(request, "genre", "Classic Fantasy"),
    tone: optionString(request, "tone", "Lyrical & Vowel-rich"),
    role: optionString(request, "role", "Common Speech"),
    structure: optionString(request, "structure", "Compound Words"),
    context:
      instructionsBlock(request) +
      "\n" +
      vaultContextBlock(request) +
      "\n" +
      optionsBlock(request),
    bannedNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  });
  return result.userMessage;
}

// ---------------------------------------------------------------------------
// Local table-based generators
// ---------------------------------------------------------------------------

const NPC_RACES = ["Human", "Elf", "Dwarf", "Halfling", "Orc", "Tiefling"];
const NPC_ROLES = [
  "Mage",
  "Warrior",
  "Rogue",
  "Priest",
  "Merchant",
  "Scholar",
  "Guard",
  "Noble",
];
const NPC_TRAITS = [
  "speaks in measured, deliberate sentences",
  "never removes their worn leather gloves",
  "collects small carved trinkets from every town visited",
  "laughs a beat too late at every joke",
];

const FACTION_TYPES = [
  "Guild",
  "Cult",
  "Order",
  "Syndicate",
  "Council",
  "Cabal",
];
const FACTION_GOALS = [
  "control the regional trade routes",
  "uncover a buried pre-cataclysm secret",
  "install a sympathetic ruler",
  "purge a rival faction from the city",
];

const SETTLEMENT_TYPES = [
  "Hamlet",
  "Village",
  "Town",
  "City",
  "Outpost",
  "Fortress",
];
const SETTLEMENT_FEATURES = [
  "a crumbling aqueduct still feeding the central well",
  "a market square that never fully closes",
  "a shrine locals leave offerings at each dawn",
  "a harbor choked with half-sunk wrecks",
];

const ITEM_RARITIES = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"];
const ITEM_KINDS = ["Blade", "Amulet", "Ring", "Staff", "Tome", "Cloak"];
const ITEM_EFFECTS = [
  "hums faintly when an untruth is spoken nearby",
  "grows warm in the presence of the undead",
  "lets the bearer recall one forgotten memory each night",
  "turns aside the first blow of any duel",
];

const EVENT_TYPES = [
  "Battle",
  "Festival",
  "Disaster",
  "Discovery",
  "Ritual",
  "Treaty",
  "Uprising",
  "Betrayal",
];
const EVENT_OUTCOMES = [
  "reshaped the balance of power across the region",
  "left a wound the locals have never forgotten",
  "forged an uneasy alliance between former enemies",
  "uncovered a secret that should have stayed buried",
];

const COUNCIL_VOTE_BODY_TYPES = [
  "Town Council",
  "Noble Court",
  "Senate",
  "Clan Moot",
  "War Council",
  "Corporate Board",
  "Revolutionary Committee",
  "Interstellar Assembly",
  "Criminal Syndicate",
  "Religious Conclave",
];
const COUNCIL_VOTE_SIZES = ["3", "5", "7", "9"];
const COUNCIL_VOTE_RULES = [
  "Simple Majority",
  "Supermajority (Two-Thirds)",
  "Unanimous",
  "Veto Power",
  "Secret Ballot",
];
const COUNCIL_VOTE_SCOPES = [
  "Single Location",
  "Distributed Across Settlements/Regions",
];
const COUNCIL_VOTE_TONES = [
  "Political",
  "Tense",
  "Desperate",
  "Farcical",
  "Somber",
  "Hopeful",
];
const COUNCIL_VOTE_ANTAGONIST_INFLUENCE = [
  "None",
  "Subtle",
  "Entrenched",
  "Dominant",
];
const COUNCIL_VOTE_ARCHETYPES = [
  "Beleaguered Ally",
  "Villain's Toady",
  "Greedy Broker",
  "Loyal Shadow",
  "Traditionalist",
  "Idealist",
  "Wildcard",
];
const COUNCIL_VOTE_STANCES = ["Support", "Oppose", "Leaning", "Unknown"];

function generateName(): string {
  const prefixes = [
    "Ael",
    "Bran",
    "Cael",
    "Dax",
    "Kael",
    "Morg",
    "Thor",
    "Vael",
  ];
  const suffixes = ["dar", "wen", "ric", "mar", "thas", "gar", "rin", "on"];
  return `${pick(prefixes)}${pick(suffixes)}`;
}

function generateNpc(request: GeneratorRunRequest): GeneratorOutput {
  const name = generateName();
  const race = optionString(request, "race", pick(NPC_RACES));
  const role = optionString(request, "role", pick(NPC_ROLES));
  const trait = pick(NPC_TRAITS);
  return {
    title: name,
    summary: `${name}, a ${race.toLowerCase()} ${role.toLowerCase()}.`,
    lore: `${name} is a ${race} ${role} who ${trait}.`,
    labels: [race, role],
  };
}

function generateFaction(request: GeneratorRunRequest): GeneratorOutput {
  const type = optionString(request, "type", pick(FACTION_TYPES));
  const name = `The ${generateName()} ${type}`;
  const goal = pick(FACTION_GOALS);
  return {
    title: name,
    summary: `${name}, a ${type.toLowerCase()} seeking to ${goal}.`,
    lore: `${name} is a ${type.toLowerCase()} whose chief aim is to ${goal}.`,
    labels: [type],
  };
}

function generateSettlement(request: GeneratorRunRequest): GeneratorOutput {
  const type = optionString(request, "type", pick(SETTLEMENT_TYPES));
  const name = generateName();
  const feature = pick(SETTLEMENT_FEATURES);
  return {
    title: name,
    summary: `${name}, a ${type.toLowerCase()} known for ${feature}.`,
    lore: `${name} is a ${type.toLowerCase()}. Its most notable feature is ${feature}.`,
    labels: [type],
  };
}

function generateMagicItem(request: GeneratorRunRequest): GeneratorOutput {
  const rarity = optionString(request, "rarity", pick(ITEM_RARITIES));
  const kind = optionString(request, "kind", pick(ITEM_KINDS));
  const name = `${kind} of ${generateName()}`;
  const effect = pick(ITEM_EFFECTS);
  return {
    title: name,
    summary: `${name}, a ${rarity.toLowerCase()} ${kind.toLowerCase()} that ${effect}.`,
    lore: `${name} is a ${rarity} ${kind.toLowerCase()}. It ${effect}.`,
    labels: [rarity, kind],
  };
}

function generateEvent(request: GeneratorRunRequest): GeneratorOutput {
  const type = optionString(request, "type", pick(EVENT_TYPES));
  const name = `The ${type} of ${generateName()}`;
  const outcome = pick(EVENT_OUTCOMES);
  return {
    title: name,
    summary: `${name}, a ${type.toLowerCase()} that ${outcome}.`,
    lore: `${name} was a ${type.toLowerCase()} that ${outcome}.`,
    labels: [type],
  };
}

function generateShip(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateShipLocal({
    genre: optionString(request, "genre", "Sci-Fi"),
    role: optionString(request, "role", ""),
    scale: optionString(request, "scale", ""),
    condition: optionString(request, "condition", ""),
    tone: optionString(request, "tone", ""),
  });
  return {
    title: result.title,
    summary: result.summary ?? "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

function generateNewsSheet(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateNewsSheetLocal({
    genre: optionString(request, "genre", "Fantasy"),
    tone: optionString(request, "tone", ""),
    bias: optionString(request, "bias", ""),
    hookDensity: optionString(request, "hookDensity", ""),
    placeName: optionString(request, "placeName", ""),
    headlineEvent: optionString(request, "headlineEvent", ""),
  });
  return {
    title: result.title,
    summary: result.summary ?? "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

function generateLanguage(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateLanguageLocal({
    genre: optionString(request, "genre", "Classic Fantasy"),
    tone: optionString(request, "tone", "Lyrical & Vowel-rich"),
    role: optionString(request, "role", "Common Speech"),
    structure: optionString(request, "structure", "Compound Words"),
    context: optionString(request, "context", ""),
  });
  return {
    title: result.title,
    summary: result.summary || "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
    languageProfile: result.languageProfile,
    languageProfileVersion: result.languageProfileVersion,
  };
}

function generateDungeon(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateDungeonLocal(dungeonOptions(request));
  return {
    title: result.title,
    summary: result.summary || "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

export function buildCampaignDungeonPrompt(request: GeneratorRunRequest) {
  const options = dungeonOptions(request);
  const prompt = buildDungeonPrompt(options);
  return {
    ...prompt,
    options,
    userMessage: `${contextChain(request)}

${prompt.userMessage}`,
  };
}

function dungeonPrompt(request: GeneratorRunRequest): string {
  return buildCampaignDungeonPrompt(request).userMessage;
}

// ---------------------------------------------------------------------------
// Adventure generator helpers
// ---------------------------------------------------------------------------

function adventureOptions(
  request: GeneratorRunRequest,
): AdventureGeneratorOptions {
  return {
    themeId: request.themeId || optionString(request, "themeId", "fantasy"),
    archetype: optionString(request, "archetype", ""),
    scale: optionString(request, "scale", ""),
    tone: optionString(request, "tone", ""),
    seed: optionString(request, "seed", ""),
    instruction: request.instructions,
    avoidNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  };
}

function generateAdventure(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateAdventureLocal(adventureOptions(request));
  return {
    title: result.title,
    summary: result.summary || "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

export function buildCampaignAdventurePrompt(request: GeneratorRunRequest) {
  const options = adventureOptions(request);
  const prompt = buildAdventurePrompt(options);
  return {
    ...prompt,
    options,
    userMessage: `${contextChain(request)}

${prompt.userMessage}`,
  };
}

function adventurePrompt(request: GeneratorRunRequest): string {
  return buildCampaignAdventurePrompt(request).userMessage;
}

function worldOptions(request: GeneratorRunRequest): WorldGeneratorOptions {
  return {
    worldType: optionString(request, "worldType", ""),
    habitability: optionString(request, "habitability", ""),
    civilisation: optionString(request, "civilisation", ""),
    societalModel: optionString(request, "societalModel", ""),
    worldTagOne: optionString(request, "worldTagOne", ""),
    worldTagTwo: optionString(request, "worldTagTwo", ""),
    genre: optionString(request, "genre", ""),
    lancerWorldFrame: optionString(request, "lancerWorldFrame", ""),
    campaignPressure: optionString(request, "campaignPressure", ""),
    dominantFeature: optionString(request, "dominantFeature", ""),
    avoidNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  };
}

function generateWorld(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateWorldLocal(worldOptions(request));
  return {
    title: result.title,
    summary: result.summary ?? "",
    content: result.content,
    lore: result.lore,
    labels: result.labels,
  };
}

function worldPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

${buildWorldPrompt(worldOptions(request)).userMessage}

Return ONLY a JSON object matching this shared schema:
${OUTPUT_SCHEMA}
${exemplarBlock("world")}${groundingNote(request)}
${loreGuidance(
  request,
  "the world profile; climate, geography, gravity, atmosphere, and biosphere; settlements, cultures, factions, economy, resources, technology, hazards, history, notable locations, mysteries, conflicts, and adventure hooks",
)}`;
}

// ---------------------------------------------------------------------------
// Council Vote generator helpers
// ---------------------------------------------------------------------------

function councilVoteSize(request: GeneratorRunRequest): number {
  const raw = optionString(request, "councilSize", "5");
  return COUNCIL_VOTE_SIZES.includes(raw) ? Number(raw) : 5;
}

function generateCouncilVote(request: GeneratorRunRequest): GeneratorOutput {
  const bodyType = optionString(
    request,
    "governingBodyType",
    pick(COUNCIL_VOTE_BODY_TYPES),
  );
  const size = councilVoteSize(request);
  const rule = optionString(request, "votingRule", pick(COUNCIL_VOTE_RULES));
  const deadline = optionString(request, "deadline", "before the week is out");
  const proposal = optionString(
    request,
    "proposal",
    "a contested proposal that will reshape the region",
  );
  const antagonistInfluence = optionString(
    request,
    "antagonistInfluence",
    pick(COUNCIL_VOTE_ANTAGONIST_INFLUENCE),
  );
  const scope = optionString(request, "scope", pick(COUNCIL_VOTE_SCOPES));
  const tone = optionString(request, "tone", pick(COUNCIL_VOTE_TONES));

  const members = Array.from({ length: size }, () => ({
    name: generateName(),
    archetype: pick(COUNCIL_VOTE_ARCHETYPES),
    stance: pick(COUNCIL_VOTE_STANCES),
  }));
  const memberLines = members
    .map(
      (m) => `- **${m.name}** (${m.archetype}) — Initial stance: ${m.stance}.`,
    )
    .join("\n");

  const title = `The Vote of the ${bodyType}`;
  const summary = `A ${tone.toLowerCase()} ${size}-seat ${bodyType.toLowerCase()} must decide on ${proposal} ${deadline}.`;
  const lore = `## The Proposal
${proposal}
## Deadline & Stakes
The vote must be called ${deadline}. Failure leaves the party's aims unresolved and cedes ground to their rivals.
## Voting Rule
${rule}, ${size} seats.
## Scope
${scope}.
## Council Members
${memberLines}
## Antagonist Influence
${
  antagonistInfluence === "None"
    ? "No hostile hand is on the scale — yet."
    : `Antagonist influence over the council is ${antagonistInfluence.toLowerCase()}.`
}
## Investigation Leads
Each councillor's public reputation hides a private agenda; asking around the ${bodyType.toLowerCase()}'s usual haunts is the fastest way to learn who can be swayed and how.
## Possible Paths
At least two coalitions of votes can carry the proposal — persuasion and evidence for the cautious, leverage and favours for the desperate. The costly best solution: win every seat outright, but only by spending every favour and secret in hand — the vote passes clean, and the party leaves owing debts, and making enemies, they cannot yet see the price of.`;

  return {
    title,
    summary,
    lore,
    labels: [bodyType, rule, `${size}-seat`, tone],
  };
}

function councilVotePrompt(request: GeneratorRunRequest): string {
  const size = councilVoteSize(request);
  return `${contextChain(request)}

Generate a Council Vote political quest: the party must secure enough votes on a council before an urgent decision is made. Instead of persuading a single ruler, the objective is divided among ${size} named voters with different motives, alliances, secrets, and demands. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock("council-vote")}${groundingNote(request)}
${loreGuidance(
  request,
  `the proposal being voted on and why the party needs it to pass; the deadline and reason for urgency; the voting procedure, threshold, and any exploitable procedural rules; the current best estimate of the vote; exactly ${size} named council members — each with a role, personality, and public reputation; their public position on the proposal; their true priorities, fears, and political agenda; an initial voting stance (support, oppose, leaning, or unknown); relationships and dependencies with other councillors; what could genuinely persuade them; a related investigation, favour, quest, or problem; secrets, leverage, or corruption that may be uncovered; several possible approaches where appropriate (persuasion, evidence, negotiation, service, exposure, procedural manoeuvring, deception, or intimidation); and the moral or political cost of securing their vote; initial leads for learning how each councillor may vote; dependencies that let one action affect several votes; likely antagonist countermeasures before voting day; a final vote scene with complications and outcome branches; and follow-up hooks created by bargains, enemies, exposed secrets, and unpaid political debts. This is a political puzzle, not a sequence of mandatory fetch quests: players should begin with incomplete information, most voters should support multiple approaches with different costs, at least one apparently easy solution should create a meaningful future complication, and the council must NOT guarantee so many friendly votes that the central challenge disappears — ensure at least two viable paths to victory exist, PLUS a distinct costly best solution: a path that wins every seat and every concession, but only at a spelled-out political price (a burned bridge, a destabilised ally, a powerful new enemy).`,
)}
Treat each councillor's initial voting stance as fixed source data: every path must explain exactly how a specific councillor's vote changes from that stated initial stance, and the final tally in any resolved path must be recalculated from those changes under the stated voting procedure — do not describe the party spending effort or resources on councillors whose vote is already secured. The costly best solution must improve on or replace the original proposal, not merely secure the same proposal through a more ethical or less costly route.
Before returning the adventure, run a consistency pass: ensure the voting rule and tally are mathematically correct for ${size} seats; every councillor's stance matches across all sections; each persuasion route directly addresses that councillor's stated motive rather than a generic bribe, and never targets a councillor whose vote is already secured; every coalition path obeys the stated voting procedure and can actually achieve the required threshold given the vote changes it describes; each changed vote must directly resolve, reward, or override that councillor's true motive, not just their public position; and the costly best solution genuinely resolves both sides of the central dilemma AND improves on or replaces the original proposal, not just the tally. Make any dependency where influencing one councillor changes another's options explicit. Fix any mismatch before responding.`;
}

const REGISTRY: Record<GeneratorId, CampaignGeneratorDefinition> = {
  npc: {
    id: "npc",
    label: "NPC",
    description: "Generate a non-player character for your campaign.",
    entityType: GENERATOR_ENTITY_TYPE.npc,
    defaultInstruction:
      "A distinctive supporting character with a clear motivation, a memorable quirk, and a secret the party could uncover.",
    icon: "lucide:user",
    options: [
      {
        id: "race",
        label: "Race",
        control: "select",
        choices: NPC_RACES.map((r) => ({ value: r, label: r })),
      },
      {
        id: "role",
        label: "Role",
        control: "select",
        choices: NPC_ROLES.map((r) => ({ value: r, label: r })),
      },
    ],
    defaults: { race: "", role: "" },
    generate: generateNpc,
    mapOutputToDraft: mapOutputToDraft("npc"),
    buildPrompt: npcPrompt,
  },
  faction: {
    id: "faction",
    label: "Faction",
    description: "Generate a faction, guild, or organization.",
    entityType: GENERATOR_ENTITY_TYPE.faction,
    defaultInstruction:
      "An organisation with a clear agenda, an internal tension, and a reason the party might ally with or oppose it.",
    icon: "lucide:users",
    options: [
      {
        id: "type",
        label: "Type",
        control: "select",
        choices: FACTION_TYPES.map((t) => ({ value: t, label: t })),
      },
    ],
    defaults: { type: "" },
    generate: generateFaction,
    mapOutputToDraft: mapOutputToDraft("faction"),
    buildPrompt: factionPrompt,
  },
  settlement: {
    id: "settlement",
    label: "Settlement",
    description: "Generate a settlement or location.",
    entityType: GENERATOR_ENTITY_TYPE.settlement,
    defaultInstruction:
      "A place the party can visit, with notable locations, a local power, and simmering tension or a rumour to investigate.",
    icon: "lucide:map-pin",
    options: [
      {
        id: "type",
        label: "Type",
        control: "select",
        choices: SETTLEMENT_TYPES.map((t) => ({ value: t, label: t })),
      },
    ],
    defaults: { type: "" },
    generate: generateSettlement,
    mapOutputToDraft: mapOutputToDraft("settlement"),
    buildPrompt: settlementPrompt,
  },
  "magic-item": {
    id: "magic-item",
    label: "Magic Item",
    description: "Generate a magic item or artifact.",
    entityType: GENERATOR_ENTITY_TYPE["magic-item"],
    defaultInstruction:
      "An evocative item with a clear benefit, a meaningful drawback or cost, and a hook tying it into the world.",
    icon: "lucide:package",
    options: [
      {
        id: "rarity",
        label: "Rarity",
        control: "select",
        choices: ITEM_RARITIES.map((r) => ({ value: r, label: r })),
      },
      {
        id: "kind",
        label: "Kind",
        control: "select",
        choices: ITEM_KINDS.map((k) => ({ value: k, label: k })),
      },
    ],
    defaults: { rarity: "", kind: "" },
    generate: generateMagicItem,
    mapOutputToDraft: mapOutputToDraft("magic-item"),
    buildPrompt: magicItemPrompt,
  },
  event: {
    id: "event",
    label: "Event",
    description: "Generate a historical or unfolding event for your campaign.",
    entityType: GENERATOR_ENTITY_TYPE.event,
    defaultInstruction:
      "A pivotal occurrence with clear causes, the key figures and places involved, lasting consequences, and a thread the party can pull on.",
    icon: "lucide:calendar",
    options: [
      {
        id: "type",
        label: "Type",
        control: "select",
        choices: EVENT_TYPES.map((t) => ({ value: t, label: t })),
      },
    ],
    defaults: { type: "" },
    generate: generateEvent,
    mapOutputToDraft: mapOutputToDraft("event"),
    buildPrompt: eventPrompt,
  },
  ship: {
    id: "ship",
    label: "Ship",
    description:
      "Generate a ship for your campaign — location, faction asset, and adventure seed.",
    entityType: GENERATOR_ENTITY_TYPE.ship,
    defaultInstruction:
      "A vessel with a clear role, a complication the crew is managing, and a secret discoverable through investigation — all woven into the world.",
    icon: "lucide:rocket",
    options: [
      {
        id: "genre",
        label: "Genre",
        control: "select",
        choices: [
          "Sci-Fi",
          "Space Opera",
          "Cyberpunk",
          "Optimistic Exploration Sci-Fi",
          "Space Opera Resistance",
          "Lancer",
          "Post-Apocalyptic",
        ].map((g) => ({ value: g, label: g })),
      },
      {
        id: "role",
        label: "Role",
        control: "select",
        choices: [
          "Freighter",
          "Warship",
          "Scout",
          "Research Vessel",
          "Colony Ship",
          "Pirate Vessel",
        ].map((r) => ({ value: r, label: r })),
      },
    ],
    defaults: { genre: "Sci-Fi", role: "" },
    generate: generateShip,
    mapOutputToDraft: mapOutputToDraft("ship"),
    buildPrompt: shipPrompt,
  },
  language: {
    id: "language",
    label: "Language",
    description:
      "Generate a fictional language profile for your world, culture, or species.",
    entityType: GENERATOR_ENTITY_TYPE.language,
    defaultInstruction:
      "A campaign-ready language profile detailing pronunciation guidelines, naming conventions, example names, and a basic vocabulary glossary.",
    icon: "lucide:message-square",
    options: [
      {
        id: "genre",
        label: "Genre",
        control: "select",
        choices: languageConfig.genres.map((g) => ({ value: g, label: g })),
      },
      {
        id: "tone",
        label: "Tone",
        control: "select",
        choices: languageConfig.tones.map((t) => ({ value: t, label: t })),
      },
      {
        id: "role",
        label: "Role",
        control: "select",
        choices: languageConfig.roles.map((r) => ({ value: r, label: r })),
      },
      {
        id: "structure",
        label: "Name Structure",
        control: "select",
        choices: languageConfig.structures.map((s) => ({ value: s, label: s })),
      },
    ],
    defaults: {
      genre: "Classic Fantasy",
      tone: "Lyrical & Vowel-rich",
      role: "Common Speech",
      structure: "Compound Words",
    },
    generate: generateLanguage,
    // The language prompt splits the profile into narrative `content` and a
    // compact GM-reference `lore`; the vault entity body (draft.lore) needs
    // both, so merge them back together here.
    mapOutputToDraft: (output, request) => ({
      ...mapOutputToDraft("language")(output, request),
      lore: [output.content, output.lore].filter(Boolean).join("\n\n"),
    }),
    buildPrompt: languagePrompt,
  },
  "news-sheet": {
    id: "news-sheet",
    label: "News Sheet",
    description:
      "Generate an in-world news sheet (a cyberpunk-style screamsheet, fantasy broadsheet, or station newsfeed) — headlines, rumours, adverts, and hooks as a player handout.",
    entityType: GENERATOR_ENTITY_TYPE["news-sheet"],
    defaultInstruction:
      "An in-world news sheet whose stories, rumours, and classifieds report recent events in the world's own voice — shaped by who owns the press — with a GM-only section holding the truth and the hooks.",
    icon: "lucide:newspaper",
    options: [
      {
        id: "genre",
        label: "Genre",
        control: "select",
        choices: newsSheetConfig.genres.map((g) => ({ value: g, label: g })),
      },
      {
        id: "tone",
        label: "Editorial Tone",
        control: "select",
        choices: newsSheetConfig.tones.map((t) => ({ value: t, label: t })),
      },
      {
        id: "bias",
        label: "Ownership / Bias",
        control: "select",
        choices: newsSheetConfig.biases.map((b) => ({ value: b, label: b })),
      },
      {
        id: "hookDensity",
        label: "Hook Density",
        control: "select",
        choices: newsSheetConfig.hookDensities.map((h) => ({
          value: h,
          label: h,
        })),
      },
      {
        id: "placeName",
        label: "Settlement or Publication Name",
        description: "Anchor the sheet to a place or name the publication.",
        control: "text",
      },
      {
        id: "headlineEvent",
        label: "Headline Event",
        description: "A current crisis or event the lead story should cover.",
        control: "text",
      },
    ],
    defaults: {
      genre: "",
      tone: "",
      bias: "",
      hookDensity: "",
      placeName: "",
      headlineEvent: "",
    },
    generate: generateNewsSheet,
    // The local generator splits the issue into a player-safe handout
    // (`content`) and GM notes (`lore`); the vault entity body needs both, so
    // merge them — mirroring the language generator above.
    mapOutputToDraft: (output, request) => ({
      ...mapOutputToDraft("news-sheet")(output, request),
      lore: [output.content, output.lore].filter(Boolean).join("\n\n"),
    }),
    buildPrompt: newsSheetPrompt,
  },
  dungeon: {
    id: "dungeon",
    label: "Dungeon / Delve",
    description:
      "Generate a multi-sector subterranean complex, ancient ruin, precursor vault, or monster lair with layout, factions, secret boss lore, hazards, and adventure hooks.",
    entityType: GENERATOR_ENTITY_TYPE.dungeon,
    defaultInstruction:
      "A thematic, multi-sector dungeon complex complete with architectural atmosphere, key sectors, inhabitant factions, central secret, hazards, loot, and adventure hooks.",
    icon: "lucide:castle",
    options: [
      {
        id: "purpose",
        label: "Original Purpose",
        control: "select",
        choices: dungeonConfig.purposes.map((p) => ({ value: p, label: p })),
      },
      {
        id: "currentState",
        label: "Current State",
        control: "select",
        choices: dungeonConfig.currentStates.map((s) => ({
          value: s,
          label: s,
        })),
      },
      {
        id: "scale",
        label: "Scale",
        control: "select",
        choices: dungeonConfig.scales.map((sc) => ({ value: sc, label: sc })),
      },
    ],
    defaults: {
      purpose: "Temple & Shrine",
      currentState: "Active Monster Lair",
      scale: "Medium Complex (3-4 Sectors)",
    },
    generate: generateDungeon,
    mapOutputToDraft: mapOutputToDraft("dungeon"),
    buildPrompt: dungeonPrompt,
  },
  adventure: {
    id: "adventure",
    label: "Adventure Idea",
    description:
      "Generate a campaign-ready adventure concept with dramatic ingredients, key actors, and multiple possible outcomes — a situation, not a plot.",
    entityType: GENERATOR_ENTITY_TYPE.adventure,
    defaultInstruction:
      "A thematic adventure concept complete with initial situation, primary objective, key locations, important NPCs, threats, clues, complications, possible outcomes, and adventure hooks.",
    icon: "lucide:map",
    options: [
      {
        id: "archetype",
        label: "Adventure Type",
        control: "select",
        choices: adventureConfig.archetypes.map((a) => ({
          value: a,
          label: a,
        })),
      },
      {
        id: "scale",
        label: "Scale",
        control: "select",
        choices: adventureConfig.scales.map((s) => ({ value: s, label: s })),
      },
      {
        id: "tone",
        label: "Tone",
        control: "select",
        choices: adventureConfig.tones.map((t) => ({ value: t, label: t })),
      },
      {
        id: "seed",
        label: "Starting Seed / Situation",
        description:
          "Optional: describe a starting scenario, NPC, or situation to anchor the adventure.",
        control: "textarea",
      },
    ],
    defaults: {
      archetype: "Investigation & Mystery",
      scale: "Short Arc (2-3 Sessions)",
      tone: "",
      seed: "",
    },
    generate: generateAdventure,
    mapOutputToDraft: mapOutputToDraft("adventure"),
    buildPrompt: adventurePrompt,
  },
  world: {
    id: "world",
    label: "World",
    description:
      "Generate a detailed sci-fi planet, moon, or artificial world with places, people, tensions, and adventure hooks.",
    entityType: GENERATOR_ENTITY_TYPE.world,
    defaultInstruction:
      "A sci-fi world with a clear environmental identity, societies shaped by that environment, active conflicts, notable locations, and playable adventure hooks.",
    icon: "lucide:earth",
    options: [
      {
        id: "worldType",
        label: "World Type",
        control: "select",
        choices: worldConfig.worldTypes.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "habitability",
        label: "Habitability",
        control: "select",
        choices: worldConfig.habitability.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "civilisation",
        label: "Civilisation",
        control: "select",
        choices: worldConfig.civilisations.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "societalModel",
        label: "Primary Societal Model",
        control: "select",
        visibleWhen: {
          optionId: "genre",
          notValues: ["Lancer"],
        },
        choices: worldConfig.societalModels.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "worldTagOne",
        label: "World Tag 1",
        description:
          "First Stars Without Number world tag shaping the setting.",
        control: "select",
        choices: worldConfig.worldTags.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "worldTagTwo",
        label: "World Tag 2",
        description:
          "Second tag to combine with the first; choose a different pressure.",
        control: "select",
        choices: worldConfig.worldTags.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "genre",
        label: "Genre / Tone",
        control: "select",
        choices: worldConfig.genres.map((value) => ({ value, label: value })),
      },
      {
        id: "lancerWorldFrame",
        label: "Lancer World Frame",
        description:
          "Political and geographic frame for a Lancer campaign world.",
        control: "select",
        visibleWhen: { optionId: "genre", values: ["Lancer"] },
        choices: worldConfig.lancerWorldFrames.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "campaignPressure",
        label: "Campaign Pressure",
        description: "The central political or social conflict for the world.",
        control: "select",
        choices: worldConfig.campaignPressures.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "dominantFeature",
        label: "Dominant Feature",
        description:
          "Optional: a defining physical feature, mystery, or condition.",
        control: "text",
      },
    ],
    defaults: {
      worldType: "Terrestrial World",
      habitability: "Earthlike",
      civilisation: "Colony",
      societalModel: "Scientific Expedition",
      worldTagOne: "Colonized Population",
      worldTagTwo: "Local Specialty",
      genre: "Hard Sci-Fi",
      lancerWorldFrame: "Union Core World",
      campaignPressure: "Resource Access and Rationing",
      dominantFeature: "",
    },
    generate: generateWorld,
    mapOutputToDraft: (output, request) => ({
      ...mapOutputToDraft("world")(output, request),
      lore: [output.content, output.lore].filter(Boolean).join("\n\n"),
    }),
    buildPrompt: worldPrompt,
  },
  "council-vote": {
    id: "council-vote",
    label: "Council Vote",
    description:
      "Generate a political vote quest: a council of named voters, each with a distinct agenda, that the party must sway before a deadline decision.",
    entityType: GENERATOR_ENTITY_TYPE["council-vote"],
    defaultInstruction:
      "A council-vote adventure with a clear proposal, deadline, voting threshold, and a named council of voters with individual stances, leverage, and investigation hooks — a political puzzle, not a fetch-quest chain.",
    icon: "lucide:gavel",
    options: [
      {
        id: "proposal",
        label: "Proposal / Desired Outcome",
        description:
          "What is being voted on, e.g. raise an army, appoint an official, open a vault, declare war.",
        control: "textarea",
      },
      {
        id: "governingBodyType",
        label: "Governing Body",
        control: "select",
        choices: COUNCIL_VOTE_BODY_TYPES.map((t) => ({ value: t, label: t })),
      },
      {
        id: "councilSize",
        label: "Council Size",
        control: "select",
        choices: COUNCIL_VOTE_SIZES.map((s) => ({
          value: s,
          label: `${s} seats`,
        })),
      },
      {
        id: "votingRule",
        label: "Voting Rule",
        control: "select",
        choices: COUNCIL_VOTE_RULES.map((r) => ({ value: r, label: r })),
      },
      {
        id: "deadline",
        label: "Deadline / Time Pressure",
        description: "Optional: when the vote is called and why it can't wait.",
        control: "text",
      },
      {
        id: "scope",
        label: "Scope",
        control: "radio",
        choices: COUNCIL_VOTE_SCOPES.map((s) => ({ value: s, label: s })),
      },
      {
        id: "tone",
        label: "Tone",
        control: "select",
        choices: COUNCIL_VOTE_TONES.map((t) => ({ value: t, label: t })),
      },
      {
        id: "antagonistInfluence",
        label: "Antagonist Influence",
        description: "How much a hostile power already controls the vote.",
        control: "select",
        choices: COUNCIL_VOTE_ANTAGONIST_INFLUENCE.map((a) => ({
          value: a,
          label: a,
        })),
      },
    ],
    defaults: {
      proposal: "",
      governingBodyType: "",
      councilSize: "5",
      votingRule: "",
      deadline: "",
      scope: "",
      tone: "",
      antagonistInfluence: "",
    },
    generate: generateCouncilVote,
    mapOutputToDraft: mapOutputToDraft("council-vote"),
    buildPrompt: councilVotePrompt,
  },
};

/** Look up a generator definition, throwing for unknown ids. */
export function getGenerator(id: string): CampaignGeneratorDefinition {
  if (!isSupportedGenerator(id)) throw new UnsupportedGeneratorError(id);
  return REGISTRY[id];
}

export function isSupportedGenerator(id: string): id is GeneratorId {
  return (SUPPORTED_GENERATOR_IDS as readonly string[]).includes(id);
}

/** The fallback generation brief for a generator (used when no user input). */
export function getDefaultInstruction(id: GeneratorId): string {
  return REGISTRY[id].defaultInstruction;
}

/** All supported generator definitions, in display order. */
export function listGenerators(): CampaignGeneratorDefinition[] {
  return SUPPORTED_GENERATOR_IDS.map((id) => REGISTRY[id]);
}
