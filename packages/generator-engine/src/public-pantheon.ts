/**
 * Public Pantheon generator — framework-free port of the SEO pantheon
 * generator.
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parsePantheonResponse, and falls back to
 * generatePantheonLocal. Session context is injected as a string.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";

export type PantheonMode = "single" | "pantheon";
export type PantheonSize = "small" | "medium" | "large";
export type PantheonWidth = "balanced" | "focused" | "wide";
export type Rng = () => number;

const defaultRng: Rng = () => Math.random();

function pickFrom<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateName(rng: Rng = defaultRng): string {
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
  return `${pickFrom(prefixes, rng)}${pickFrom(suffixes, rng)}`;
}

export const pantheonConfig = {
  genres: [
    "Classic Fantasy",
    "Cyberpunk / Corporate",
    "Vampire / Gothic Noir",
    "Sci-Fi / Space Opera",
    "Modern Conspiracy",
    "Post-Apocalyptic",
  ],
  divineTypes: [
    "God",
    "Spirit",
    "Saint",
    "Demon",
    "Ancestor",
    "Abstract Force",
  ],
  domains: [
    "War",
    "Nature",
    "Knowledge",
    "Shadow",
    "Death",
    "Light",
    "Arcana",
    "Chaos",
    "Harmony",
  ],
  tones: ["Mythic", "Dark / Grim", "Mystical", "Weird / Strange", "Heroic"],
  worshippers: [
    "Mystery Cult",
    "State Religion",
    "Secret Brotherhood",
    "Nomadic Tribe",
    "Folk Devotion",
  ],
  conflictThemes: [
    "Succession War",
    "Cosmic Balance",
    "Betrayal",
    "Forbidden Love",
    "Forgotten Pact",
  ],
  sizes: [
    { label: "Small (3–4 deities)", value: "small", min: 3, max: 4 },
    { label: "Medium (5–7 deities)", value: "medium", min: 5, max: 7 },
    { label: "Large (8–12 deities)", value: "large", min: 8, max: 12 },
  ] as {
    label: string;
    value: PantheonSize;
    min: number;
    max: number;
  }[],
  widths: [
    { label: "Diverse (Central Theme Focus)", value: "balanced" },
    { label: "Focused (Single Domain Focus)", value: "focused" },
    { label: "Wide (Broad Mythic Pantheon)", value: "wide" },
  ] as {
    label: string;
    value: PantheonWidth;
  }[],
  symbols: [
    "A weeping golden eye",
    "A black iron key wrapped in thorns",
    "An inverted silver crescent moon",
    "A burning wheel with nine spokes",
    "A skull holding a blossoming lily",
    "A twin-headed serpent swallowing its tail",
    "A cracked crystal mirror reflecting starlight",
    "A bronze scale weighted with a raven feather",
  ],
  rituals: [
    "Silent meditation under a starless night sky.",
    "A feast of bread and salt where all weapons are left at the door.",
    "Anointing the thresholds of homes with spring water at dawn.",
    "Burning dried sage and leaving small copper coins at crossroads.",
    "Tying silk ribbons of different colors to the branches of a hollow oak.",
    "Whispering confessions to a flame before extinguishing it in oil.",
  ],
  myths: [
    "The Great Eclipse: How the deity swallowed the sun to protect the realm from a cosmic terror.",
    "The Iron Treaty: The day the deity descended to forge the boundaries between mortals and the divine.",
    "The Shattered Mirror: How the deity split their own soul into seven pieces to populate the sky with stars.",
    "The First Tear: The origin of the world's deepest ocean, wept when the deity's companion chose mortality.",
  ],
};

export interface PantheonGeneratorOptions {
  mode?: PantheonMode;
  size?: PantheonSize;
  width?: PantheonWidth;
  genre?: string;
  divineType?: string;
  domain?: string;
  tone?: string;
  worshippers?: string;
  conflictTheme?: string;
  campaignContext?: string;
}

export interface ResolvedPantheon {
  mode: PantheonMode;
  sizeCfg: (typeof pantheonConfig.sizes)[number];
  width: PantheonWidth;
  genre: string;
  divineType: string;
  domain: string;
  tone: string;
  worshipperType: string;
  conflictTheme: string;
  campaignContext: string;
  randomSymbol: string;
  randomHighlightRitual: string;
  randomMyth: string;
  generatedDeityName: string;
}

export interface PantheonPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedPantheon;
}

function genreLabel(genre: string): string {
  return genre.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

function domainScope(width: PantheonWidth, domain: string): string {
  if (width === "focused") {
    return `Focused Pantheon: every deity must represent a distinct aspect, sub-domain, philosophy, contradiction, or extreme interpretation of the primary domain: ${domain}. Do not include unrelated gods.`;
  }
  if (width === "wide") {
    return `Wide Mythic Pantheon: create a broad pantheon with many different divine domains, e.g. rulership, war, death, nature, craft, love, fate, trickery, knowledge, sea, sky, underworld, hearth, travel, harvest, magic, dreams, law, wilderness, art, prophecy, and other major mortal concerns. The primary domain ${domain} should appear as one important divine concern, but it must not dominate.`;
  }
  return `Central Theme Pantheon: create a diverse pantheon, but make ${domain} the central force, sacred obsession, source of crisis, or highest divine authority.`;
}

function resolvePantheon(
  options: PantheonGeneratorOptions,
  rng: Rng,
): ResolvedPantheon {
  const sizeCfg =
    pantheonConfig.sizes.find((s) => s.value === options.size) ??
    pantheonConfig.sizes[0];

  return {
    mode: options.mode || "single",
    sizeCfg,
    width: options.width || "balanced",
    genre: options.genre || "Classic Fantasy",
    divineType: options.divineType || pickFrom(pantheonConfig.divineTypes, rng),
    domain: options.domain || pickFrom(pantheonConfig.domains, rng),
    tone: options.tone || pickFrom(pantheonConfig.tones, rng),
    worshipperType:
      options.worshippers || pickFrom(pantheonConfig.worshippers, rng),
    conflictTheme:
      options.conflictTheme || pickFrom(pantheonConfig.conflictThemes, rng),
    campaignContext: options.campaignContext?.trim() || "",
    randomSymbol: pickFrom(pantheonConfig.symbols, rng),
    randomHighlightRitual: pickFrom(pantheonConfig.rituals, rng),
    randomMyth: pickFrom(pantheonConfig.myths, rng),
    generatedDeityName: generateName(rng),
  };
}

export function buildPantheonPrompt(
  options: PantheonGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): PantheonPrompt {
  const resolved = resolvePantheon(options, rng);
  const {
    mode,
    sizeCfg,
    width,
    genre,
    divineType,
    domain,
    tone,
    worshipperType,
    conflictTheme,
    campaignContext,
    generatedDeityName,
  } = resolved;

  if (mode === "single") {
    return {
      resolved,
      systemInstruction:
        "You are an expert RPG campaign writer. You generate detailed, table-ready single deities or divine spirits for tabletop GMs in JSON format.",
      userMessage: `Generate a detailed RPG Deity/Spirit in JSON format.
Options:
- Name suggestion: ${generatedDeityName}
- Genre/Theme: ${genre}
- Divine Type: ${divineType}
- Primary Domain: ${domain}
- Tone: ${tone}
- Worshippers: ${worshipperType}
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly, no markdown fences:
{
  "title": "A majestic name for the deity (e.g. Solaris the Lightbringer, Xal'Koth the Devourer)",
  "summary": "One-sentence overview of the deity's core nature.",
  "content": "Markdown. Use exactly these section headers in order: '### Deity Description', '### Divine Portfolio', '### Worship & Cults'. Describe their appearance, symbols, dogmas, and temples.",
  "lore": "Markdown. Use exactly this structure:\\n### At a Glance\\n- **👤 Deity Type**: ${divineType}\\n- **✨ Primary Domain**: ${domain}\\n- **👥 Worshippers**: ${worshipperType}\\n- **📍 Sacred Symbol**: description of symbol\\n- **📅 Secret**: a dark truth or hidden vulnerability\\n- **⚔ Immediate Hook**: one-sentence GM hook\\n### Rituals & Taboos\\n- description of common ritual\\n- description of taboo\\n### Myths & Legends\\n- brief myth summary\\n### Adventure Hooks\\n- adventure hook 1\\n- adventure hook 2",
  "labels": ["rpg-deity", "deity-generator", "imported-draft", "${genreLabel(genre)}"]
}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting.`,
    };
  }

  return {
    resolved,
    systemInstruction:
      "You are an expert RPG campaign writer and worldbuilding assistant. You generate cohesive, campaign-ready pantheons of deities, divine politics, worship practices, myths, and adventure hooks. You always return strict valid JSON only, without markdown code fences or commentary.",
    userMessage: `Generate a detailed RPG Pantheon matching the parameters below.

GENERATION OPTIONS
- Genre/Theme: ${genre}
- Tone: ${tone}
- Primary Conflict Theme: ${conflictTheme}
- Primary Domain Focus: ${domain}
- Domain Scope: ${domainScope(width, domain)}
- Worshippers: ${worshipperType}
- Pantheon Size: ${sizeCfg.min}–${sizeCfg.max} deities
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

CREATIVE REQUIREMENTS
1. The pantheon must be an interconnected divine system, not a list of unrelated gods.
2. Include a critical hidden problem: an internal contradiction, schism, suppressed heresy, approaching divine disaster, divine succession crisis, cosmic wound, forbidden truth, or unresolved mythic crime that creates immediate campaign pressure.
3. Establish strong, active relationships between the deities: alliance, rivalry, debt, ancient grievance, family bond, oath, betrayal, marriage, contested inheritance, theological opposition, or divine dependency.
4. Avoid generic names like "God of War", "The Sun Goddess", "The Dark One", or "Lord of Death". Use evocative, genre-appropriate names.
5. Do not use real-world religious names unless explicitly requested by the campaign context.
6. Do not contradict the provided campaign context.
7. Make the faith felt in the world: include rituals, taboos, clergy hierarchies, temple economies, omens, cultural impacts, and social consequences.
8. Adhere strictly to the chosen Domain Scope regarding how heavily ${domain} influences individual deity portfolios.
9. If Domain Scope is Focused Pantheon, every deity must be meaningfully tied to ${domain}.
10. If Domain Scope is Central Theme Pantheon, most deities should relate to ${domain}, but they may also cover other important domains.
11. If Domain Scope is Wide Mythic Pantheon, include a wide spread of divine portfolios. Do not force every deity to relate directly to ${domain}; make ${domain} one important part of the wider divine order.
12. The hidden problem must be reflected across multiple sections: the meta, history, deities, relationships, culture, and campaign seeds. Do not isolate it in only one field.
13. In Focused Pantheon scope, deity relationships should arise from conflicting interpretations, methods, virtues, taboos, duties, or extremes of ${domain}, not from unrelated domains.
14. Ensure that the generated characters, factions, and events explicitly name and tie into the specific deities and relationships created in your arrays.

OUTPUT FORMAT RULES
- Return ONLY one valid JSON object.
- Do not wrap the response in backticks or markdown code fences.
- Do not include comments or explanatory text outside the JSON.
- Ensure the response is valid JSON. Escape all newlines as \\n.
- CHARACTER ESCAPE SAFETY: To prevent JSON parsing breaks, do not use double quotes inside string values. Use single quotes ('') for all titles, dialogue, or monikers inside the JSON strings. Do not backslash-escape these single quotes.
- Do not include additional top-level fields.
- ARRAY CONSTRAINTS:
  * The "deities" array must contain between ${sizeCfg.min} and ${sizeCfg.max} elements.
  * The "relationships" array must contain at least 2 elements mapping connections between the generated deities.
  * Every "relationships.deity_a" and "relationships.deity_b" value must exactly match a deity name from the "deities" array.
  * In each relationship object, "deity_a" and "deity_b" must be two completely different, distinct deities.
  * The "characters" array must contain 2-4 entries.
  * The "factions" array must contain 1-2 entries.
  * The "events" array must contain 1-2 entries.
  * The "locations" array must contain 1-2 entries.
  * Each character, faction, and event hook must explicitly mention at least one deity name from the "deities" array.
- Do not use wiki-style links, square-bracket links, or double-bracket entity links.

The JSON object must match this structure exactly:
{
  "title": "A majestic name for the pantheon",
  "summary": "One-sentence summary of the core belief system and its primary tension.",
  "meta": {
    "conflict_theme": "${conflictTheme}",
    "worshippers": "${worshipperType}",
    "public_dogma": "What most mortals believe.",
    "hidden_problem": "The underlying secret, divine wound, betrayal, forbidden truth, or approaching crisis.",
    "immediate_hook": "A one-sentence GM hook tied directly to the hidden problem."
  },
  "history": {
    "origin_and_dogma": "The mythic origin of the pantheon and the truth or lie holding the faith together.",
    "structure_and_laws": "The hierarchy, divine roles, sacred laws, succession rules, divine family structure, or balance of power."
  },
  "deities": [
    {
      "name": "Unique deity name",
      "description": "One-sentence mythic summary of who this deity is and why mortals care.",
      "appearance": "One-sentence description of this deity's mythic appearance, iconic avatar, or physical manifestation.",
      "portfolio": "Specific domains, abstract concepts, and mortal elements ruled by this deity.",
      "divine_role": "Their role in the pantheon's hierarchy, family, mythic order, or cosmic machinery.",
      "personality": "Divine demeanor, outlook, virtues, flaws, and mythic temperament.",
      "common_worshippers": "Who most often worships, fears, bargains with, or serves this deity.",
      "taboo": "What angers, offends, or spiritually violates this deity.",
      "symbol": "Holy symbol, sacred animal, weapon, color, plant, constellation, or other recognizable sign.",
      "worship_style": "How mortals usually worship this deity.",
      "conflict_relation": "How this deity aligns with, worsens, resists, exploits, or misunderstands the primary conflict theme."
    }
  ],
  "relationships": [
    {
      "deity_a": "Name of one deity from the deities array",
      "deity_b": "Name of a different deity from the deities array",
      "relationship_type": "Alliance, rivalry, marriage, debt, betrayal, oath, family bond, ancient grievance, theological opposition, contested inheritance, or divine dependency.",
      "campaign_pressure": "How this relationship creates problems, hooks, omens, cult conflicts, wars, quests, or divine interference."
    }
  ],
  "culture": {
    "clergy_roles": "Priestly roles, ranks, duties, privileges, rival offices, and internal tensions.",
    "temples_and_shrines": "Places of worship, sacred sites, pilgrimage customs, temple economies, and regional variations.",
    "common_rite": "Everyday ritual practiced by ordinary mortals.",
    "high_rite": "Major ceremony, festival, sacrifice, trial, coronation, funeral custom, or pilgrimage.",
    "omens": ["Specific omen 1", "Specific omen 2"],
    "taboos": ["Specific taboo 1", "Specific taboo 2"]
  },
  "campaign_seeds": {
    "rumors": ["Rumor or legend 1", "Rumor or legend 2", "Rumor or legend 3"],
    "characters": [
      {
        "name": "NPC name",
        "role": "Senior clergy, prophet, saint, heretic, chosen vessel, temple assassin, rival high priest, oracle-child, or fallen priest.",
        "hook": "Why this character matters in play and how they relate to the generated deities."
      }
    ],
    "factions": [
      {
        "name": "Faction name",
        "type": "Cult, temple order, inquisition, reform movement, schismatic sect, sacred bloodline, mystery cult, or divine conspiracy.",
        "hook": "What this faction wants, how it causes trouble, and which deity they target or serve."
      }
    ],
    "events": [
      {
        "name": "Event name",
        "type": "Divine betrayal, broken oath, sacred festival, prophecy, miracle gone wrong, schism, apocalypse sign, godly disappearance, or mythic war.",
        "hook": "How this event can enter the campaign and which deities are caught in its fallout."
      }
    ],
    "locations": [
      {
        "name": "Location name",
        "type": "Grand temple, forbidden shrine, holy battlefield, oracle cave, pilgrimage road, sealed divine prison, abandoned monastery, divine birthplace, underworld gate, or sky-palace ruin.",
        "hook": "Why adventurers might go there."
      }
    ]
  },
  "labels": [
    "rpg-pantheon",
    "pantheon-generator",
    "imported-draft",
    "${genreLabel(genre)}"
  ]
}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object.`,
  };
}

function cleanJson(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function formatPantheonContent(data: Record<string, unknown>): {
  content: string;
  lore: string;
} {
  const history = rec(data.history);
  const meta = rec(data.meta);
  const culture = rec(data.culture);
  const campaignSeeds = rec(data.campaign_seeds);
  const relationships = arr(data.relationships);

  const content = `### Origin & Dogma
${str(history.origin_and_dogma)}

### Pantheon Structure
${str(history.structure_and_laws)}

### Divine Alliances & Rivalries
${relationships
  .map((r) => {
    const relationship = rec(r);
    return `- **${str(relationship.deity_a)}** and **${str(relationship.deity_b)}** (${str(relationship.relationship_type) || "connected"}): ${str(relationship.campaign_pressure)}`;
  })
  .join("\n")}
`;

  const lore = `### At a Glance
- **Pantheon Name**: ${str(data.title)}
- **Conflict Theme**: ${str(meta.conflict_theme)}
- **Worshippers**: ${str(meta.worshippers)}
- **Hidden Problem**: ${str(meta.hidden_problem)}
- **Immediate Hook**: ${str(meta.immediate_hook)}

### Deities of the Pantheon
${arr(data.deities)
  .map((d) => {
    const deity = rec(d);
    return `- **${str(deity.name)}**: ${str(deity.description)} (Portfolio: ${str(deity.portfolio)})`;
  })
  .join("\n")}

### Clergy & Temples
- **Clergy Roles**: ${str(culture.clergy_roles)}
- **Temples & Shrines**: ${str(culture.temples_and_shrines)}
- **Common Rite**: ${str(culture.common_rite)}
- **High Rite**: ${str(culture.high_rite)}

### Rumours & Legends
${arr(campaignSeeds.rumors)
  .map((r) => `- ${str(r)}`)
  .join("\n")}

### Entity Seeds
${arr(campaignSeeds.characters)
  .map((c) => {
    const character = rec(c);
    return `- **👤 ${str(character.name)}${character.role ? ` (${str(character.role)})` : ""}**: ${str(character.hook)}`;
  })
  .join("\n")}
${arr(campaignSeeds.factions)
  .map((f) => {
    const faction = rec(f);
    return `- **👥 ${str(faction.name)}${faction.type ? ` (${str(faction.type)})` : ""}**: ${str(faction.hook)}`;
  })
  .join("\n")}
${arr(campaignSeeds.events)
  .map((e) => {
    const event = rec(e);
    return `- **📅 ${str(event.name)}${event.type ? ` (${str(event.type)})` : ""}**: ${str(event.hook)}`;
  })
  .join("\n")}
${arr(campaignSeeds.locations)
  .map((l) => {
    const location = rec(l);
    return `- **📍 ${str(location.name)}${location.type ? ` (${str(location.type)})` : ""}**: ${str(location.hook)}`;
  })
  .join("\n")}
`;

  return { content, lore };
}

export function parsePantheonResponse(
  text: string,
  resolved: Pick<ResolvedPantheon, "mode" | "generatedDeityName">,
): PublicGeneratorOutput {
  const data = rec(JSON.parse(cleanJson(text)));
  const isSingle = resolved.mode === "single";
  const shaped =
    isSingle || (data.content && data.lore)
      ? { content: str(data.content), lore: str(data.lore) }
      : formatPantheonContent(data);

  return {
    type: isSingle ? "character" : "faction",
    title:
      str(data.title) ||
      (isSingle ? resolved.generatedDeityName : "The Divine Assembly"),
    summary: str(data.summary),
    content: shaped.content,
    lore: shaped.lore,
    labels: Array.isArray(data.labels)
      ? (data.labels as string[])
      : isSingle
        ? ["rpg-deity", "deity-generator", "imported-draft"]
        : ["rpg-pantheon", "pantheon-generator", "imported-draft"],
    status: "active",
  };
}

export function generatePantheonLocal(
  options: PantheonGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolvePantheon(options, rng);
  const {
    mode,
    sizeCfg,
    width,
    genre,
    divineType,
    domain,
    tone,
    worshipperType,
    conflictTheme,
    campaignContext,
    randomSymbol,
    randomHighlightRitual,
    randomMyth,
    generatedDeityName,
  } = resolved;

  if (mode === "single") {
    const title = `${generatedDeityName}, the ${tone} ${divineType} of ${domain}`;
    const summary = `A powerful ${divineType.toLowerCase()} governing the forces of ${domain.toLowerCase()} with a ${tone.toLowerCase()} outlook.`;

    let content = `### Deity Description
The deity ${generatedDeityName} manifests as a striking presence aligned with ${domain.toLowerCase()}. Commonly depicted carrying ${randomSymbol.toLowerCase()}, their sacred icons can be found carved in old shrines.

### Divine Portfolio
Followers look to ${generatedDeityName} for guidance in matters of ${domain.toLowerCase()}. The deity's tenets demand adhering to the laws of ${tone.toLowerCase()} harmony and resisting the temptations of rival entities.

### Worship & Cults
The worship of this ${divineType.toLowerCase()} is usually organized as a ${worshipperType.toLowerCase()}. Temples range from modest roadside altars to grand cathedrals built in urban centers.`;

    if (campaignContext) {
      content += `\n\n### Influence of Campaign Context\nIn this campaign setting (${campaignContext}), the deity's worshippers have adapted to these circumstances, altering their rites accordingly.`;
    }

    const lore = `### At a Glance
- **👤 Deity Type**: ${divineType}
- **✨ Primary Domain**: ${domain}
- **👥 Worshippers**: ${worshipperType}
- **📍 Sacred Symbol**: ${randomSymbol}
- **📅 Secret**: Holds a secret fear of their own power being forgotten by mortal hearts.
- **⚔ Immediate Hook**: A lost tomb dedicated to this deity has been uncovered, containing a relic that has begun to glow.

### Rituals & Taboos
- **Ritual**: ${randomHighlightRitual}
- **Taboo**: Damaging or defacing sacred symbols of ${domain.toLowerCase()} is believed to bring immediate bad fortune.

### Myths & Legends
- **The Tale of Creation**: ${randomMyth}

### Adventure Hooks
- A high priest of the local ${worshipperType.toLowerCase()} hires the adventurers to recover a stolen relic.
- A heretical sect has arisen, claiming the deity demands a dark and forbidden sacrifice.`;

    return {
      type: "character",
      title,
      summary,
      content,
      lore,
      labels: ["rpg-deity", "deity-generator", "imported-draft"],
      status: "active",
    };
  }

  const pantheonTitle = `The ${generatedDeityName} Pantheon`;
  const summary =
    width === "focused"
      ? `A collection of deities focused on the domain of ${domain.toLowerCase()} bound by the theme of ${conflictTheme.toLowerCase()} in a ${genre.toLowerCase()} world.`
      : width === "wide"
        ? `A wide mythic collection of deities representing various domains, bound by the theme of ${conflictTheme.toLowerCase()} in a ${genre.toLowerCase()} world.`
        : `A collection of deities bound by the theme of ${conflictTheme.toLowerCase()} in a ${genre.toLowerCase()} world with ${domain.toLowerCase()} at its center.`;

  const deityCount = sizeCfg.min;
  const deityNames = Array.from({ length: deityCount }, () =>
    generateName(rng),
  );

  let content = `### Origin & Dogma
According to legend, the deities of this pantheon were born from a single cosmic event. Under the theme of ${conflictTheme.toLowerCase()}, they divide the control of the cosmos between their spheres of influence.

### Pantheon Structure
The pantheon consists of ${deityCount} deities:
${deityNames
  .map(
    (n, i) =>
      `${i + 1}. **${n}**: ${
        width === "focused"
          ? `Controls a specific aspect of the ${domain.toLowerCase()} domain (e.g. ${
              i === 0
                ? "its pure essence"
                : i === deityCount - 1
                  ? "its quiet or hidden aspects"
                  : "its active or aggressive expression"
            }).`
          : width === "wide"
            ? `Controls a distinct mythic domain (e.g. ${
                i === 0
                  ? `the domain of ${domain.toLowerCase()}`
                  : i === 1
                    ? "wildlands and travel"
                    : i === 2
                      ? "dreams and shadows"
                      : "hearth and community"
              }).`
            : i === 0
              ? `Represents the domain of ${domain}.`
              : i === deityCount - 1
                ? "A neutral arbiter holding the balance."
                : "Controls opposing forces of the cosmos."
      }`,
  )
  .join("\n")}

### Divine Alliances & Rivalries
- **${deityNames[0]}** is allied with **${deityNames[deityNames.length - 1]}**, but stands in direct opposition to **${deityNames[1]}**.
- **${deityNames[1]}** seeks to overthrow the established order of the other deities.`;

  if (campaignContext) {
    content += `\n\n### Influence of Campaign Context\nIn this campaign setting (${campaignContext}), the struggles of the pantheon are reflected in the shifting boundaries of the mortal kingdoms.`;
  }

  const lore = `### At a Glance
- **Pantheon Name**: ${pantheonTitle}
- **Conflict Theme**: ${conflictTheme}
- **Worshippers**: ${worshipperType}
- **Hidden Problem**: An ancient prophecy predicts that one of the deities will fall, destabilizing the entire celestial hierarchy.
- **Immediate Hook**: Omens of celestial alignment have sent local cults into a frenzy of preparations.

### Deities of the Pantheon
${deityNames
  .map(
    (n, i) =>
      `- **${n}**: ${
        width === "focused"
          ? `The deity representing a key facet of ${domain.toLowerCase()}${
              i === 0
                ? ", depicted as a guardian/warrior."
                : i === 1
                  ? ", representing the shadow or depth of the sphere."
                  : ", guarding the balance/transition points."
            }`
          : width === "wide"
            ? `The deity governing ${
                i === 0
                  ? domain.toLowerCase()
                  : i === 1
                    ? "wildlands and travel"
                    : i === 2
                      ? "dreams and shadows"
                      : "hearth and community"
              }.`
            : i === 0
              ? `The deity of ${domain}, depicted as a warrior.`
              : i === 1
                ? "A mysterious spirit of chaos and shadows."
                : "An ancient ancestor guarding the gates of death."
      }`,
  )
  .join("\n")}

### Clergy & Temples
- **Clergy Roles**: The High Hierophant oversees the circle of priests, who are divided into keepers of rites and speakers of prophecy.
- **Temples & Shrines**: Grand stone cathedrals are located in capital cities, while simple stone altars mark major crossroads.

### Rumours & Legends
- A forgotten temple of the pantheon lies submerged under the local lake.
- The high priests of the deities are secretly meeting to avert a holy war.

### Entity Seeds
- **👥 ${worshipperType}**: A major temple order or mystery cult dedicated to the worship of the pantheon.`;

  return {
    type: "faction",
    title: pantheonTitle,
    summary,
    content,
    lore,
    labels: ["rpg-pantheon", "pantheon-generator", "imported-draft"],
    status: "active",
  };
}
