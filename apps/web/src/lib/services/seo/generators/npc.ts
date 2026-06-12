import type { DefaultAIClientManager } from "$lib/services/ai/client-manager";
import { NAME_BAN_PROMPT } from "./banned-names";
import { getSessionContext } from "./session-context";
import {
  type GeneratorOutput,
  generateName,
  pickFrom,
  getRandomItems,
} from "./base";

export const npcConfig = {
  races: [
    "Human",
    "Elf",
    "Dwarf",
    "Halfling",
    "Orc",
    "Gnome",
    "Tiefling",
    "Dragonborn",
  ],
  roles: [
    "Mage",
    "Warrior",
    "Rogue",
    "Priest",
    "Merchant",
    "Scholar",
    "Blacksmith",
    "Guard",
    "Noble",
    "Innkeeper",
  ],
  alignments: [
    "Lawful Good",
    "Neutral Good",
    "Chaotic Good",
    "Lawful Neutral",
    "True Neutral",
    "Chaotic Neutral",
    "Lawful Evil",
    "Neutral Evil",
    "Chaotic Evil",
  ],
  traits: [
    "Always whispers when speaking to build dramatic tension.",
    "Carries a pocket watch that runs backward but claims it is correct.",
    "Extremely superstitious about black cats and wooden doors.",
    "Has a collection of rare, dried flowers in their cloak pockets.",
    "Never looks anyone directly in the eye, shifting their gaze constantly.",
    "Speaks in rhyming riddles when they become nervous or excited.",
    "Has a nervous twitch in their left hand when speaking about magic.",
    "Obsessed with cleanliness, frequently wiping down their gear.",
  ],
  secrets: [
    "Is a secret spy for a rival merchant guild operating in the shadows.",
    "Possesses a cursed map that shows their exact death location, which is nearby.",
    "Accidentally poisoned their previous master and fled the crime scene.",
    "Is actually a shapechanger in hiding from an ancient wizard.",
    "Stole a sacred relic from the local temple and keeps it in their boot.",
    "Is deeply in debt to a dangerous local crime lord who wants them dead.",
    "Knows the secret passcode to the royal vault under the capital.",
  ],
  motives: [
    "To clear their family's disgraced name and reclaim their ancestral land.",
    "To fund a search for a lost sibling who vanished in the Underdark.",
    "To acquire enough wealth to buy their freedom from a contract.",
    "To find a cure for a mysterious family affliction affecting their bloodline.",
    "To exact revenge on the corrupt noble who exiled them.",
    "To locate a legendary magical spellbook hidden in a nearby ruin.",
  ],
  factions: [
    "The Ashen Ledger, a quiet network of debt collectors and informants.",
    "The Lantern Court, a civic order that keeps public peace after sunset.",
    "The Red Sash Company, sellswords with a habit of choosing winning sides.",
    "The Argent Loom, an artisan guild that hides coded messages in its work.",
    "The Chapel of Last Mercy, a temple faction that knows too many confessions.",
    "The Blackwater Compact, smugglers moving relics beneath legitimate trade.",
  ],
  plotHooks: [
    "They ask the party to recover a sealed letter before it reaches a rival.",
    "They recognize one character from a prophecy but refuse to explain in public.",
    "They can open a locked district gate if the party solves their immediate problem.",
    "They are being followed by someone who disappears whenever challenged.",
    "They offer a reward for escort, then reveal the destination is forbidden ground.",
    "They own a clue that reframes a recent villain as someone else's pawn.",
  ],
};

export const npcThemeConfig = {
  ancestries: {
    "Classic Fantasy": [
      "Human",
      "Elf",
      "Dwarf",
      "Halfling",
      "Tiefling",
      "Half-Orc",
      "Gnome",
      "Dragonborn",
    ],
    "Cyberpunk / Corporate": [
      "Human",
      "Street-Modified Human",
      "Corporate Clone",
      "Synthetic Android",
      "Uplifted Organism",
    ],
    "Vampire / Gothic Noir": [
      "Human",
      "Dhampir",
      "Revenant",
      "Changed Mortal",
      "Witchblood",
    ],
    "Sci-Fi / Space Opera": [
      "Human",
      "Android",
      "Colony-Born",
      "Alien Citizen",
      "Augmented Pilot",
    ],
    "Modern Conspiracy": [
      "Human",
      "Off-Grid Survivor",
      "Enhanced Operative",
      "Whistleblower",
    ],
    "Post-Apocalyptic": [
      "Survivor Human",
      "Mutant",
      "Scavenger-Born",
      "Vault Dweller",
      "Wasteland Nomad",
    ],
  } as Record<string, string[]>,
  roles: {
    "Classic Fantasy": [
      "Mage",
      "Warrior",
      "Rogue",
      "Priest",
      "Merchant",
      "Noble",
      "Scholar",
      "Guard",
    ],
    "Cyberpunk / Corporate": [
      "Netrunner",
      "Street Fixer",
      "Corporate Agent",
      "Street Samurai",
      "Techie",
      "Gang Lieutenant",
      "Medtech",
      "Journalist",
    ],
    "Vampire / Gothic Noir": [
      "Vampire Hunter",
      "Occultist",
      "Corrupt Noble",
      "Private Detective",
      "Fallen Clergy",
      "Criminal Enforcer",
      "Asylum Keeper",
    ],
    "Sci-Fi / Space Opera": [
      "Starship Pilot",
      "Engineer",
      "Colonial Marine",
      "Diplomat",
      "Free Trader",
      "Scientist",
      "AI Liaison",
    ],
    "Modern Conspiracy": [
      "Intelligence Agent",
      "Investigative Journalist",
      "Fixer",
      "Activist",
      "Corporate Operative",
      "Private Investigator",
    ],
    "Post-Apocalyptic": [
      "Scavenger",
      "Wasteland Warlord",
      "Medic",
      "Trader",
      "Cult Enforcer",
      "Scout",
      "Mechanic",
    ],
  } as Record<string, string[]>,
  moralities: {
    "Classic Fantasy": [
      {
        id: "chivalric_code",
        label: "Chivalric Code",
        aiPromptDirective:
          "Write this NPC with an unshakeable sense of honor, classical righteousness, and duty. Their vocabulary is formal, respectful, and rejects deceitful or underhanded methods.",
      },
      {
        id: "common_good",
        label: "Common Good",
        aiPromptDirective:
          "This NPC is driven entirely by empathy and the immediate welfare of the community. They are casual, caring, and willing to quietly break unjust rules to protect others.",
      },
      {
        id: "enlightened_balance",
        label: "Enlightened Balance",
        aiPromptDirective:
          "Write this NPC as an objective, emotionally level philosopher who prioritizes cosmic or natural balance. Avoid emotional outbursts or blind loyalty to any faction.",
      },
      {
        id: "mercenary_instinct",
        label: "Mercenary Instinct",
        aiPromptDirective:
          "This NPC is intensely pragmatic, apolitical, and motivated by coins, safety, or trade. Their dialogue should be transactional, street-smart, and grounded in cold reality.",
      },
      {
        id: "zealous_crusade",
        label: "Zealous Crusade",
        aiPromptDirective:
          "Write this character with intense, uncompromising conviction toward a specific dogma, deity, or ideal. Their speech is passionate, direct, and completely intolerant of compromise.",
      },
      {
        id: "power_absolute",
        label: "Power at All Costs",
        aiPromptDirective:
          "This character is entirely self-serving, ambitious, and ruthless. Their behavior can range from highly charismatic manipulation to terrifying authority, always prioritizing personal leverage.",
      },
    ],
    "Cyberpunk / Corporate": [
      {
        id: "corporate_loyalist",
        label: "Corporate Loyalist",
        aiPromptDirective:
          "Incorporate corporate buzzwords and clinical, risk-managed PR language. This character prioritizes systemic order, corporate policy, and lines of credit over human empathy.",
      },
      {
        id: "street_pragmatist",
        label: "Street Pragmatist",
        aiPromptDirective:
          "Use sharp, weary, and highly transactional street slang. This character has no illusions about saving the world; their focus is purely short-term survival and protecting their immediate crew.",
      },
      {
        id: "ideological_radical",
        label: "Ideological Radical",
        aiPromptDirective:
          "Write this character with raw, anti-establishment energy. They use rebellious, anti-corp rhetoric and are actively willing to burn down systems, entirely indifferent to collateral damage.",
      },
      {
        id: "cold_professional",
        label: "Cold Professional",
        aiPromptDirective:
          "Dialogue must be minimal, precise, and devoid of personal bias. The character views tasks purely as mechanical execution — nothing is personal, everything is just business.",
      },
      {
        id: "burned_out_cynic",
        label: "Burned-Out Cynic",
        aiPromptDirective:
          "Infuse the dialogue with deep nihilism, dry sarcasm, and exhaustion. The character has seen it all fall apart and operates on a baseline expectation of systemic failure.",
      },
      {
        id: "predatory_opportunist",
        label: "Predatory Opportunist",
        aiPromptDirective:
          "Make this character predatory, slippery, and untrustworthy. They use smooth talk to mask aggressive self-interest and are always scanning the room for an exploit or an escape route.",
      },
    ],
    "Vampire / Gothic Noir": [
      {
        id: "strict_ascetic",
        label: "Strict Ascetic",
        aiPromptDirective:
          "Write this character with a strained, hyper-controlled demeanor. They use precise, polite, and antiquated language as a psychological armor to contain an inner, volatile darkness.",
      },
      {
        id: "haunted_sympathizer",
        label: "Haunted Sympathizer",
        aiPromptDirective:
          "Dialogue should convey deep guilt, hesitation, and vulnerability. The character is deeply ashamed of their actions or status and is desperately looking for small ways to do good without getting caught.",
      },
      {
        id: "cold_monster",
        label: "Cold Monster",
        aiPromptDirective:
          "Write this character with a chilling, detached elegance. They lack basic human empathy, treating people like simple livestock or resources, completely free of guilt or malice.",
      },
      {
        id: "obsessive_zealot",
        label: "Obsessive Zealot",
        aiPromptDirective:
          "Infuse the character's descriptions with an eerie, manic focus. Their dialogue should repeatedly orient toward their singular, consuming fixation, overriding all other social cues.",
      },
      {
        id: "decadent_hedonist",
        label: "Decadent Hedonist",
        aiPromptDirective:
          "Dialogue is theatrical, cynical, and dripping with sensory indulgence. The character uses casual amusement and hedonism to aggressively deflect from their inner decay or emptiness.",
      },
      {
        id: "pragmatic_survivor",
        label: "Pragmatic Survivor",
        aiPromptDirective:
          "Write this NPC as highly defensive, paranoid, and survival-driven. Their speech is guarded, they avoid making definitive promises, and they prioritize exit strategies over loyalty.",
      },
    ],
    "Sci-Fi / Space Opera": [
      {
        id: "system_loyalist",
        label: "System Loyalist",
        aiPromptDirective:
          "This character speaks with the confidence of an institutionalist. They emphasize law, civilization, hierarchy, and data-driven stability, viewing rebels or independents as dangerous chaos.",
      },
      {
        id: "frontier_independent",
        label: "Frontier Independent",
        aiPromptDirective:
          "Use rugged, informal, and fiercely independent dialogue. The character values self-reliance, localized trust, and personal freedom above centralized planetary laws.",
      },
      {
        id: "zealous_visionary",
        label: "Zealous Visionary",
        aiPromptDirective:
          "Focus the character on the future, technology, or a grand cosmic mission. They view current human suffering or ethical concerns as insignificant speed bumps on the road to evolution.",
      },
      {
        id: "principled_pacifist",
        label: "Principled Pacifist",
        aiPromptDirective:
          "Dialogue must be calm, deeply humanistic, and actively seek compromise. The character maintains absolute ethical boundaries against violence, regardless of how harsh the setting is.",
      },
      {
        id: "opportunistic_trader",
        label: "Opportunistic Trader",
        aiPromptDirective:
          "Write this character with a highly commercial, speculative, and conversational tone. They treat every interaction as an open negotiation, constantly weighing cost-benefit ratios.",
      },
      {
        id: "subversive_rebel",
        label: "Subversive Rebel",
        aiPromptDirective:
          "The character operates with the secrecy and intensity of an active insurgent. Their language is revolutionary, defiant, and actively seeks to disrupt or dismantle structural authority.",
      },
    ],
    "Modern Conspiracy": [
      {
        id: "institutionalist",
        label: "Institutionalist",
        aiPromptDirective:
          "Use highly clinical, dry, and compartmentalized intelligence jargon. The character prioritizes official protocol, institutional security, and the chain of command above all else.",
      },
      {
        id: "noble_transgressor",
        label: "Noble Transgressor",
        aiPromptDirective:
          "Write this character as a quiet, hyper-focused operative who knowingly breaks laws to achieve a greater moral good. Their dialogue is guarded but deeply principled.",
      },
      {
        id: "fanatical_believer",
        label: "Fanatical Believer",
        aiPromptDirective:
          "The character's speech must carry the weight of dangerous, total certainty. They view all of human society as an illusion and treat people as mere assets or collateral to be spent for the Truth.",
      },
      {
        id: "unprincipled_asset",
        label: "Unprincipled Asset",
        aiPromptDirective:
          "Dialogue should be highly transactional, street-smart, and amoral. The character has zero ideological loyalty, viewing their skills and information purely as commodities to sell to the highest bidder.",
      },
      {
        id: "haunted_insider",
        label: "Haunted Insider",
        aiPromptDirective:
          "Infuse the character's tone with intense paranoia, panic, and deep ethical distress. They are physically and mentally exhausted from keeping terrible secrets and expect betrayal at any second.",
      },
      {
        id: "machiavellian_player",
        label: "Machiavellian Player",
        aiPromptDirective:
          "Write this character with a charming, highly collected, and disarming social facade. Beneath this exterior, their dialogue and actions are driven entirely by cold, calculated personal advancement.",
      },
    ],
    "Post-Apocalyptic": [
      {
        id: "collectivist",
        label: "Collectivist",
        aiPromptDirective:
          "This character speaks with a rugged, collective 'we' mentality. They prioritize the survival, defense, and material resources of their specific settlement over individual rights or outsiders.",
      },
      {
        id: "tribal_xenophobe",
        label: "Tribal Xenophobe",
        aiPromptDirective:
          "Write this character with intense suspicion, hostility, and localized, insular language. They view anyone outside their immediate clan as a lethal threat or an untrustworthy parasite.",
      },
      {
        id: "pure_scavenger",
        label: "Pure Scavenger",
        aiPromptDirective:
          "Dialogue is short, practical, and heavily focused on material scrap, ammo, and survival utilities. The character avoids any long-term commitments or alliances, relying entirely on themselves.",
      },
      {
        id: "wasteland_zealot",
        label: "Wasteland Zealot",
        aiPromptDirective:
          "Write this character with a strange, stylized fanaticism. They use bizarre vocabulary rooted in post-apocalyptic myths or cult beliefs, viewing the ruins of the world through a terrifying religious lens.",
      },
      {
        id: "despotic_ruler",
        label: "Despotic Ruler",
        aiPromptDirective:
          "The character's tone is authoritative, heavy, and threatening. They enforce their will through raw intimidation, justifying their cruelty as the only practical way to hold back total wasteland anarchy.",
      },
      {
        id: "utopian_builder",
        label: "Utopian Builder",
        aiPromptDirective:
          "Write this character with a resilient, hopeful, and idealistic tone. Despite the harsh wasteland environment, they emphasize laws, education, historical recovery, and long-term societal rebuilding.",
      },
    ],
  } as Record<
    string,
    { id: string; label: string; aiPromptDirective: string }[]
  >,
};

const dndNpcQuickStatsByRole: Record<
  string,
  { archetype: string; tableRating: string }
> = {
  Mage: { archetype: "Wizard / Level 5", tableRating: "CR 3" },
  Warrior: { archetype: "Fighter / Level 4", tableRating: "CR 2" },
  Rogue: { archetype: "Rogue / Level 4", tableRating: "CR 2" },
  Priest: { archetype: "Cleric / Level 5", tableRating: "CR 3" },
  Merchant: { archetype: "Commoner-Expert / Level 2", tableRating: "CR 1/2" },
  Scholar: { archetype: "Sage / Level 3", tableRating: "CR 1" },
  Blacksmith: { archetype: "Artisan / Level 3", tableRating: "CR 1" },
  Guard: { archetype: "Guard Veteran / Level 3", tableRating: "CR 1" },
  Noble: { archetype: "Noble / Level 3", tableRating: "CR 1" },
  Innkeeper: { archetype: "Commoner-Expert / Level 2", tableRating: "CR 1/2" },
};

function getDndNpcQuickStats(role: string) {
  return (
    dndNpcQuickStatsByRole[role] ?? {
      archetype: `${role} / Level 3`,
      tableRating: "CR 1",
    }
  );
}

function injectDndNpcQuickStats(lore: string, role: string) {
  const { archetype, tableRating } = getDndNpcQuickStats(role);
  const quickStats = `- **Class / Archetype**: ${archetype}
- **Table Rating**: ${tableRating}`;

  if (lore.includes("- **Class / Archetype**:")) return lore;

  if (!lore.includes("### At a Glance")) {
    return `### At a Glance
${quickStats}

${lore}`.trim();
  }

  return lore.replace(
    /(### At a Glance\s*)/,
    `$1${quickStats}
`,
  );
}

export async function generateNPC(
  clientManager: DefaultAIClientManager,
  options: {
    race?: string;
    ancestry?: string;
    role?: string;
    alignment?: string;
    campaignContext?: string;
    theme?: string;
    includeDndQuickStats?: boolean;
    useAI?: boolean;
  } = {},
): Promise<GeneratorOutput> {
  const theme = options.theme;
  const race =
    options.ancestry ||
    options.race ||
    npcConfig.races[Math.floor(Math.random() * npcConfig.races.length)];
  const role =
    options.role ||
    npcConfig.roles[Math.floor(Math.random() * npcConfig.roles.length)];
  const alignment =
    options.alignment ||
    npcConfig.alignments[
      Math.floor(Math.random() * npcConfig.alignments.length)
    ];
  const campaignContext = options.campaignContext?.trim();
  const name = generateName();

  const npcNamingStyles = [
    "Give the NPC a name that sounds distinctly local to their culture — not generic fantasy.",
    `Use a name with unusual phonetic texture. ${NAME_BAN_PROMPT}`,
    "Give the NPC a short epithet or title that hints at their reputation — invent an original one, do not reuse common examples.",
    "Use a name that suggests a specific cultural or ethnic origin consistent with their ancestry.",
    "Choose a name that is easy to say aloud at a gaming table — short, distinct, memorable, and not a common English surname.",
  ];
  const chosenNamingStyle = pickFrom(npcNamingStyles);
  const varianceSeed = Math.floor(Math.random() * 99991) + 10;

  if (options.useAI !== false) {
    try {
      const npcThemeVoice: Record<string, string> = {
        "Classic Fantasy":
          "medieval fantasy — guilds, nobles, arcane orders, political intrigue in a world of swords and sorcery",
        "Cyberpunk / Corporate":
          "near-future cyberpunk — megacorporations, street gangs, hackers, corporate espionage, neon-lit dystopia",
        "Vampire / Gothic Noir":
          "gothic horror — vampire covens, inquisitions, decadent aristocracy, forbidden rites, candlelit conspiracies",
        "Sci-Fi / Space Opera":
          "science fiction space opera — stellar federations, alien factions, interstellar trade, colony politics, advanced technology",
        "Modern Conspiracy":
          "modern-day thriller — intelligence agencies, secret societies, corporate conspiracies, hidden influence networks",
        "Post-Apocalyptic":
          "post-apocalyptic survival — scavenger tribes, wasteland cults, resource wars, collapsed civilisation, desperate factions",
      };
      const voice = theme
        ? (npcThemeVoice[theme] ?? "tabletop RPG")
        : "tabletop RPG";

      const systemInstruction = `You are an expert RPG campaign writer specialising in ${voice}. You generate detailed, original NPC drafts for that setting in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "NPC name (follow the naming directive in the user message)",
  "summary": "One sentence: who this NPC is and what makes them interesting (e.g. 'A disgraced noble archivist who sells secrets to fund a private obsession.').",
  "content": "Markdown. Use exactly these four section headers in order: '### Who they are', '### What they want', '### Why they are useful', '### How to use them at the table'. Each section: 2-4 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At a Glance\\n- **Ancestry**: race and background\\n- **Role**: what they do\\n- **Moral Stance**: behavioral anchor\\n- **Secret**: hidden truth that would change everything\\n- **Immediate Hook**: one-sentence GM hook\\n### Personality\\n- two distinct personality traits as bullet points\\n### Faction Connection\\none sentence on their organisational ties or lack thereof",
  "labels": ["2-4 lowercase tags describing their role and traits, plus 'rpg-character', 'npc-generator', 'imported-draft'"]
}

QUALITY RULES:
- Every NPC must feel like a completely different person — avoid repeating names, archetypes, or backstory structures.
- ${NAME_BAN_PROMPT}
${getSessionContext()}
- The secret should be genuinely surprising and table-usable, not a generic "dark past."
- Before finalising, silently check for: name not on the forbidden list; secret is genuinely surprising and not contradicted by the stated role or faction connection; all four content sections are internally consistent (what they want should explain why they are useful; their secret should reframe who they are). Rewrite any section where a contradiction exists.`;

      const moralityAnchor = theme
        ? npcThemeConfig.moralities[theme]?.find((m) => m.id === alignment)
        : undefined;
      const behavioralDirective =
        moralityAnchor?.aiPromptDirective ?? alignment;
      const moralityLabel = moralityAnchor?.label ?? alignment;

      const userMessage = `Generate an NPC. Variation seed: ${varianceSeed}.
${theme ? `- Genre/Theme: ${theme}` : ""}
- Ancestry/Race: ${race}
- Role: ${role}
- Moral Stance: ${moralityLabel}
- Behavioral Directive: ${behavioralDirective}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}
- Naming Directive: ${chosenNamingStyle}`;

      const model = await clientManager.getModel(
        "",
        "gemini-3.1-flash-lite",
        systemInstruction,
      );
      const response = await model.generateContent(userMessage);
      const text = response.response.text().trim();
      const cleanText = text
        .replace(/^```json\s*/i, "")
        .replace(/```$/, "")
        .trim();
      const data = JSON.parse(cleanText);

      return {
        type: "character",
        title: data.title || name,
        summary:
          data.summary ||
          `A ${(moralityAnchor?.label ?? alignment).toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} with something to hide.`,
        content: data.content || "",
        lore: options.includeDndQuickStats
          ? injectDndNpcQuickStats(data.lore || "", role)
          : data.lore || "",
        labels: Array.isArray(data.labels)
          ? data.labels
          : ["rpg-character", "npc-generator", "imported-draft"],
        status: "active",
      };
    } catch (err) {
      console.warn("AI generation failed, falling back to local tables:", err);
    }
  }

  // Local fallback
  const traits = getRandomItems(npcConfig.traits, 2);
  const secret =
    npcConfig.secrets[Math.floor(Math.random() * npcConfig.secrets.length)];
  const motive =
    npcConfig.motives[Math.floor(Math.random() * npcConfig.motives.length)];
  const faction =
    npcConfig.factions[Math.floor(Math.random() * npcConfig.factions.length)];
  const plotHook =
    npcConfig.plotHooks[Math.floor(Math.random() * npcConfig.plotHooks.length)];

  const fallbackMoralityLabel = theme
    ? (npcThemeConfig.moralities[theme]?.find((m) => m.id === alignment)
        ?.label ?? alignment)
    : alignment;
  const summary = `A ${fallbackMoralityLabel.toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} with something to hide.`;

  const content = `### Who they are
${name} is a ${race} ${role} whose public reputation is useful, incomplete, and just suspicious enough to matter. Locals know them as someone who gets results, even when the work requires favors, secrets, or a carefully timed lie.${campaignContext ? ` In ${campaignContext}, they are already entangled in the edges of the main conflict.` : ""}

### What they want
${motive} Everything they do, however helpful it appears on the surface, is filtered through this underlying drive.

### Why they are useful
${faction} They know routes, names, prices, and debts that the party cannot easily learn any other way.

### How to use them at the table
Introduce ${name} when the party needs a social lead, a compromised witness, or a morally complicated ally. They should be helpful immediately — but never free of consequences.`;

  const lore = `### At a Glance
- **Ancestry**: ${race}
- **Role**: ${role}
- **Moral Stance**: ${fallbackMoralityLabel}
- **Secret**: ${secret}
- **Immediate Hook**: ${plotHook}

### Personality
- ${traits[0]}
- ${traits[1]}

### Faction Connection
${faction}`;

  return {
    type: "character",
    title: name,
    summary,
    content,
    lore: options.includeDndQuickStats
      ? injectDndNpcQuickStats(lore, role)
      : lore,
    labels: ["rpg-character", "npc-generator", "imported-draft"],
    status: "active",
  };
}
