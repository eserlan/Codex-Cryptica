import type { DefaultAIClientManager } from "$lib/services/ai/client-manager";
import { NAME_BAN_PROMPT } from "./banned-names";
import { getSessionContext } from "./session-context";
import { type GeneratorOutput, generateName, pickFrom } from "./base";

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
    value: "small" | "medium" | "large";
    min: number;
    max: number;
  }[],
  widths: [
    { label: "Diverse (Multiple Domains)", value: "balanced" },
    { label: "Focused (Single Domain Focus)", value: "focused" },
  ] as {
    label: string;
    value: "balanced" | "focused";
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

export async function generatePantheon(
  clientManager: DefaultAIClientManager,
  options: {
    mode?: "single" | "pantheon";
    size?: "small" | "medium" | "large";
    width?: "balanced" | "focused";
    genre?: string;
    divineType?: string;
    domain?: string;
    tone?: string;
    worshippers?: string;
    conflictTheme?: string;
    campaignContext?: string;
    useAI?: boolean;
  } = {},
): Promise<GeneratorOutput> {
  const mode = options.mode || "single";
  const sizeCfg =
    pantheonConfig.sizes.find((s) => s.value === options.size) ??
    pantheonConfig.sizes[0];
  const width = options.width || "balanced";
  const genre = options.genre || "Classic Fantasy";
  const divineType = options.divineType || pickFrom(pantheonConfig.divineTypes);
  const domain = options.domain || pickFrom(pantheonConfig.domains);
  const tone = options.tone || pickFrom(pantheonConfig.tones);
  const worshipperType =
    options.worshippers || pickFrom(pantheonConfig.worshippers);
  const conflictTheme =
    options.conflictTheme || pickFrom(pantheonConfig.conflictThemes);
  const campaignContext = options.campaignContext?.trim() || "";

  const randomSymbol = pickFrom(pantheonConfig.symbols);
  const randomHighlightRitual = pickFrom(pantheonConfig.rituals);
  const randomMyth = pickFrom(pantheonConfig.myths);

  // Invent a base name for a deity
  const generatedDeityName = generateName();

  if (options.useAI !== false) {
    try {
      let prompt = "";
      let systemInstruction = "";

      if (mode === "single") {
        systemInstruction =
          "You are an expert RPG campaign writer. You generate detailed, table-ready single deities or divine spirits for tabletop GMs in JSON format.";
        prompt = `Generate a detailed RPG Deity/Spirit in JSON format.
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
  "lore": "Markdown. Use exactly this structure:\\n### At a Glance\\n- **Deity Type**: ${divineType}\\n- **Primary Domain**: ${domain}\\n- **Worshippers**: ${worshipperType}\\n- **Sacred Symbol**: description of symbol\\n- **Secret**: a dark truth or hidden vulnerability\\n- **Immediate Hook**: one-sentence GM hook\\n### Rituals & Taboos\\n- description of common ritual\\n- description of taboo\\n### Myths & Legends\\n- brief myth summary\\n### Adventure Hooks\\n- adventure hook 1\\n- adventure hook 2",
  "labels": ["rpg-deity", "deity-generator", "imported-draft", "${genre.toLowerCase().replace(/[^a-z0-9]/g, "-")}"]
}
${NAME_BAN_PROMPT}
${getSessionContext()}
Return only the JSON object. Do not include markdown code block formatting.`;
      } else {
        systemInstruction =
          "You are an expert RPG campaign writer. You generate cohesive, campaign-ready pantheons of deities and divine conflicts in JSON format.";
        prompt = `Generate a detailed RPG Pantheon in JSON format.
Options:
- Genre/Theme: ${genre}
- Tone: ${tone}
- Primary Conflict Theme: ${conflictTheme}
- Primary Domain Focus: ${domain}
- Domain Scope: ${width === "focused" ? `Focused (all member deities must be dedicated to aspects or sub-domains of the primary domain: ${domain}, representing different facets of it)` : `Balanced (a diverse and complete set of different types of gods covering multiple domains, with ${domain} as a chief or central focus of the pantheon)`}
- Worshippers: ${worshipperType}
- Pantheon Size: ${sizeCfg.min}–${sizeCfg.max} deities
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly, no markdown fences:
{
  "title": "A majestic name for the Pantheon (e.g. The Solar Conclave, The Seven Broken Shields)",
  "summary": "One-sentence summary of the pantheon's main belief system.",
  "content": "Markdown. Use exactly these section headers in order: '### Origin & Dogma', '### Pantheon Structure', '### Divine Alliances & Rivalries'. Describe how the deities relate to one another, referencing them by name.",
  "lore": "Markdown. Use exactly this structure:\\n### At a Glance\\n- **Pantheon Name**: Name of pantheon\\n- **Conflict Theme**: ${conflictTheme}\\n- **Worshippers**: ${worshipperType}\\n- **Hidden Problem**: the underlying divine tension\\n- **Immediate Hook**: one-sentence GM hook\\n### Deities of the Pantheon\\nDetail ${sizeCfg.min}-${sizeCfg.max} member deities. Format each deity exactly as:\\n- **[[Deity Name]]**: short 1-line description\\n### Clergy & Temples\\n- **Clergy Roles**: describe the core clergy roles and responsibilities\\n- **Temples & Shrines**: describe the main places of worship\\n### Rumours & Legends\\n- short hook 1\\n- short hook 2\\n### Entity Seeds\\n- list of Codex entity types for each deity plus one cult faction (e.g. '**Character**: Deity A', '**Faction**: Pantheon Cult')",
  "labels": ["rpg-pantheon", "pantheon-generator", "imported-draft", "${genre.toLowerCase().replace(/[^a-z0-9]/g, "-")}"]
}
${NAME_BAN_PROMPT}
${getSessionContext()}
Return only the JSON object. Do not include markdown code block formatting.`;
      }

      const model = await clientManager.getModel(
        "",
        "gemini-3.1-flash-lite",
        systemInstruction,
      );
      const response = await model.generateContent(prompt);
      const text = response.response.text().trim();
      const cleanText = text
        .replace(/^```json\s*/i, "")
        .replace(/```$/, "")
        .trim();
      const data = JSON.parse(cleanText);

      return {
        type: mode === "single" ? "character" : "faction",
        title:
          data.title ||
          (mode === "single" ? generatedDeityName : "The Divine Assembly"),
        summary: data.summary || "",
        content: data.content || "",
        lore: data.lore || "",
        labels: Array.isArray(data.labels)
          ? data.labels
          : mode === "single"
            ? ["rpg-deity", "deity-generator", "imported-draft"]
            : ["rpg-pantheon", "pantheon-generator", "imported-draft"],
        status: "active",
      };
    } catch (err) {
      console.warn("AI generation failed, falling back to local tables:", err);
    }
  }

  // Fallback Generation Logic
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
- **Deity Type**: ${divineType}
- **Primary Domain**: ${domain}
- **Worshippers**: ${worshipperType}
- **Sacred Symbol**: ${randomSymbol}
- **Secret**: Holds a secret fear of their own power being forgotten by mortal hearts.
- **Immediate Hook**: A lost tomb dedicated to this deity has been uncovered, containing a relic that has begun to glow.

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
  } else {
    // Pantheon fallback logic
    const pantheonTitle = `The ${generatedDeityName} Pantheon`;
    const summary =
      width === "focused"
        ? `A collection of deities focused on the domain of ${domain.toLowerCase()} bound by the theme of ${conflictTheme.toLowerCase()} in a ${genre.toLowerCase()} world.`
        : `A collection of deities bound by the theme of ${conflictTheme.toLowerCase()} in a ${genre.toLowerCase()} world.`;

    const deityCount = sizeCfg.min;
    const deityNames = Array.from({ length: deityCount }, () => generateName());

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
          : i === 0
            ? `Represents the domain of ${domain}.`
            : i === deityCount - 1
              ? "A neutral arbiter holding the balance."
              : "Controls opposing forces of the cosmos."
      }`,
  )
  .join("\n")}

### Divine Alliances & Rivalries
- **[[${deityNames[0]}]]** is allied with **[[${deityNames[deityNames.length - 1]}]]**, but stands in direct opposition to **[[${deityNames[1]}]]**.
- **[[${deityNames[1]}]]** seeks to overthrow the established order of the other deities.`;

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
      `- **[[${n}]]**: ${
        width === "focused"
          ? `The deity representing a key facet of ${domain.toLowerCase()}${
              i === 0
                ? ", depicted as a guardian/warrior."
                : i === 1
                  ? ", representing the shadow or depth of the sphere."
                  : ", guarding the balance/transition points."
            }`
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
${deityNames.map((n) => `- **Character**: [[${n}]]`).join("\n")}
- **Faction**: ${worshipperType}`;

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
}
