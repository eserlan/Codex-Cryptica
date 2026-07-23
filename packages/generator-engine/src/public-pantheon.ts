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
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import {
  parseFencedJson,
  asString as str,
  asRecord as rec,
  asArray as arr,
} from "./llm-response-utils";

export { type PantheonMode, type PantheonSize, type PantheonWidth, pantheonConfig } from "./public-pantheon-constants";
import { type PantheonMode, type PantheonSize, type PantheonWidth, pantheonConfig } from "./public-pantheon-constants";

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
    randomSymbol: pickFrom(
      pantheonConfig.symbolsByGenre[options.genre ?? ""] ??
        pantheonConfig.symbolsByGenre["Classic Fantasy"],
      rng,
    ),
    randomHighlightRitual: pickFrom(
      pantheonConfig.ritualsByGenre[options.genre ?? ""] ??
        pantheonConfig.ritualsByGenre["Classic Fantasy"],
      rng,
    ),
    randomMyth: pickFrom(
      pantheonConfig.mythsByGenre[options.genre ?? ""] ??
        pantheonConfig.mythsByGenre["Classic Fantasy"],
      rng,
    ),
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
  const data = rec(parseFencedJson(text));
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

    const deityDescriptions = [
      `The deity ${generatedDeityName} manifests as a striking presence aligned with ${domain.toLowerCase()}. Commonly depicted carrying ${randomSymbol.toLowerCase()}, their sacred icons can be found carved in old shrines.`,
      `${generatedDeityName} is a ${divineType.toLowerCase()} whose presence is felt in the ${domain.toLowerCase()} of everyday life rather than dramatic revelation. Their symbol, ${randomSymbol.toLowerCase()}, appears in places of quiet devotion.`,
      `Those who study ${generatedDeityName} disagree on what form this ${divineType.toLowerCase()} truly takes — only the domain of ${domain.toLowerCase()} is constant across all accounts. Their symbol, ${randomSymbol.toLowerCase()}, predates the oldest written records.`,
      `${generatedDeityName} is not worshipped through fear but through recognition — this ${divineType.toLowerCase()} governs ${domain.toLowerCase()} because those forces existed before the deity and will outlast them. The symbol, ${randomSymbol.toLowerCase()}, reflects that ancient relationship.`,
      `Temples to ${generatedDeityName} tend to be built where ${domain.toLowerCase()} is most immediately felt. Their symbol, ${randomSymbol.toLowerCase()}, marks places of significance to the faithful and warning to the uninitiated.`,
    ] as const;

    const divinePortfolios = [
      `Followers look to ${generatedDeityName} for guidance in matters of ${domain.toLowerCase()}. The deity's tenets demand adhering to the laws of ${tone.toLowerCase()} harmony and resisting the temptations of rival entities.`,
      `The portfolio of ${generatedDeityName} covers ${domain.toLowerCase()} in all its forms — the benign and the terrible alike. Followers are expected to embrace the full scope, not just the parts that are comfortable.`,
      `${generatedDeityName}'s domain of ${domain.toLowerCase()} is interpreted differently across sects, but all agree that the deity's ${tone.toLowerCase()} nature shapes how that power is expressed and what price it demands.`,
      `Devotion to ${generatedDeityName} is understood as submission to the truth of ${domain.toLowerCase()} rather than appeals for personal favor. The deity answers — but not always in ways the petitioner expected.`,
      `The tenets of ${generatedDeityName} are less a moral code than an acknowledgment of how ${domain.toLowerCase()} works. The ${tone.toLowerCase()} framing sets the deity apart from others who govern similar forces.`,
    ] as const;

    const worshipDescriptions = [
      `The worship of this ${divineType.toLowerCase()} is usually organized as a ${worshipperType.toLowerCase()}. Temples range from modest roadside altars to grand cathedrals built in urban centers.`,
      `The ${worshipperType.toLowerCase()} that organises worship of ${generatedDeityName} maintains a careful distinction between public-facing practice and the rites reserved for the initiated.`,
      `Practitioners form ${worshipperType.toLowerCase()} structures that vary significantly by region, but all share the core understanding that ${generatedDeityName} is not petitioned — they are engaged.`,
      `The ${worshipperType.toLowerCase()} built around this deity tends to attract people who already live close to ${domain.toLowerCase()}. The formal hierarchy is secondary to the lived relationship.`,
      `Organized worship takes the form of a ${worshipperType.toLowerCase()}, though splinter sects with divergent interpretations of the ${tone.toLowerCase()} doctrine have always complicated the official hierarchy.`,
    ] as const;

    const deitySecrets = [
      `Holds a secret fear of their own power being forgotten by mortal hearts.`,
      `Has been slowly losing influence to a younger divine force and is engineering a crisis to restore relevance.`,
      `Once granted a mortal a boon that cannot be undone — and has been managing the consequences ever since.`,
      `Made a bargain with another divine power that fundamentally compromises their stated domain.`,
      `Their most devoted worshippers know something about the deity that the clergy actively suppresses.`,
    ] as const;

    const deityHooks = [
      `A lost tomb dedicated to this deity has been uncovered, containing a relic that has begun to glow.`,
      `A sect claiming direct communication with ${generatedDeityName} has emerged, and the established clergy does not know whether to denounce or investigate them.`,
      `The deity's symbol has started appearing in locations where no worshipper has been — scratched into walls, pressed into mud, burned into wood.`,
      `A mortal has begun performing miracles attributed to ${generatedDeityName} without any priestly training. The temple wants to know why before the wrong people ask the same question.`,
      `Something the deity is supposed to protect has gone missing. The clergy is keeping it quiet, but the silence itself is starting to draw attention.`,
    ] as const;

    const deityTaboos = [
      `Damaging or defacing sacred symbols of ${domain.toLowerCase()} is believed to bring immediate bad fortune.`,
      `To speak the deity's name in a place of violence is considered an invitation for consequence — not divine punishment exactly, but a shift in how things go.`,
      `Worshippers of ${generatedDeityName} do not swear oaths in the deity's name. The deity's attention, once called, is not easily redirected.`,
      `Those who mock the domain of ${domain.toLowerCase()} in earshot of a shrine are understood to be testing something. Most stop after the first incident.`,
      `The one true taboo is acting against ${domain.toLowerCase()} while seeking the deity's blessing. The prayers are heard — but the hypocrisy is noted.`,
    ] as const;

    const deityAdventureHooks = [
      [
        `A high priest of the local ${worshipperType.toLowerCase()} hires the adventurers to recover a stolen relic.`,
        `A heretical sect has arisen, claiming the deity demands a dark and forbidden sacrifice.`,
      ],
      [
        `A dying worshipper gives the party a map and asks them to complete a pilgrimage they cannot finish. They do not explain what waits at the end.`,
        `Two ${worshipperType.toLowerCase()} sects are escalating toward open conflict over an interpretation of scripture neither side will back down from.`,
      ],
      [
        `The deity has gone silent — no answers to prayers, no signs, no miracles. The clergy wants to know why before the faithful notice.`,
        `A relic associated with ${generatedDeityName} has been sold to a collector who has no idea what they have purchased.`,
      ],
      [
        `The ${worshipperType.toLowerCase()} has received a vision that contradicts their founding doctrine. They need outside eyes before they decide what to do with it.`,
        `Someone has been performing the ${randomHighlightRitual.toLowerCase()} incorrectly — and the results have been accumulating somewhere nearby.`,
      ],
      [
        `A noble family is attempting to co-opt the ${worshipperType.toLowerCase()} for political purposes. The hierarchy is divided on whether to resist or accommodate.`,
        `A ruin recently excavated near the capital contains evidence that ${generatedDeityName}'s history is not what the official texts claim.`,
      ],
    ] as const;

    const deityDesc = pickFrom(deityDescriptions, rng);
    const divinePort = pickFrom(divinePortfolios, rng);
    const worshipDesc = pickFrom(worshipDescriptions, rng);
    const deitySecret = pickFrom(deitySecrets, rng);
    const deityHook = pickFrom(deityHooks, rng);
    const deityTaboo = pickFrom(deityTaboos, rng);
    const adventureHookPair = pickFrom(deityAdventureHooks, rng);

    let content = `### Deity Description
${deityDesc}

### Divine Portfolio
${divinePort}

### Worship & Cults
${worshipDesc}`;

    if (campaignContext) {
      content += `\n\n### Influence of Campaign Context\nIn this campaign setting (${campaignContext}), the deity's worshippers have adapted to these circumstances, altering their rites accordingly.`;
    }

    const lore = `### At a Glance
- **👤 Deity Type**: ${divineType}
- **✨ Primary Domain**: ${domain}
- **👥 Worshippers**: ${worshipperType}
- **📍 Sacred Symbol**: ${randomSymbol}
- **📅 Secret**: ${deitySecret}
- **⚔ Immediate Hook**: ${deityHook}

### Rituals & Taboos
- **Ritual**: ${randomHighlightRitual}
- **Taboo**: ${deityTaboo}

### Myths & Legends
- **The Tale of Creation**: ${randomMyth}

### Adventure Hooks
- ${adventureHookPair[0]}
- ${adventureHookPair[1]}`;

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

  const pantheonOrigins = [
    `According to legend, the deities of this pantheon were born from a single cosmic event. Under the theme of ${conflictTheme.toLowerCase()}, they divide the control of the cosmos between their spheres of influence.`,
    `The oldest texts describe these deities emerging not at the beginning of time but at its first break — the moment when ${conflictTheme.toLowerCase()} entered the cosmos and forced a division of responsibility.`,
    `These deities did not create the world. They arose from it, shaped by the theme of ${conflictTheme.toLowerCase()} that already ran through everything. Their domains reflect what the cosmos needed to be governed, not what they chose.`,
    `The origin of this pantheon is disputed by the sects that follow it. What all accounts agree on is that the theme of ${conflictTheme.toLowerCase()} preceded the deities — they are its expression, not its authors.`,
    `Myths describe these deities forming a compact in response to a threat the cosmos could not survive without cooperation. The theme of ${conflictTheme.toLowerCase()} is the scar that compact left on everything that followed.`,
  ] as const;

  let content = `### Origin & Dogma
${pickFrom(pantheonOrigins, rng)}

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
