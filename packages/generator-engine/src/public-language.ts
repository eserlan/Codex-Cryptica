/**
 * Public Language generator — framework-free conlang generator.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { NAME_BAN_PROMPT } from "./public-npc";

export const languageConfig = {
  genres: [
    "Classic Fantasy",
    "Cyberpunk / Corporate",
    "Vampire / Gothic Noir",
    "Sci-Fi / Space Opera",
    "Modern Conspiracy",
    "Post-Apocalyptic",
  ],
  tones: [
    "Harsh & Consonant-heavy",
    "Lyrical & Vowel-rich",
    "Ancient & Formal",
    "Clipped & Technical",
    "Shadowy & Whispered",
  ],
  roles: [
    "Common Speech",
    "Sacred / Ritual Tongue",
    "Imperial Standard",
    "Thieves' Cant",
    "Dead Language",
  ],
  structures: [
    "Compound Words",
    "Suffix-heavy",
    "Prefix-heavy",
    "Short & Monosyllabic",
  ],
};

// Creative direction per genre so the LLM leans on setting-specific
// vocabulary/loanword flavor instead of only the word "genre" itself.
const GENRE_HINTS: Record<string, string> = {
  "Classic Fantasy":
    "Draw on archaic, myth-inspired roots — the language should feel handed down through bloodlines and old magic.",
  "Cyberpunk / Corporate":
    "Blend clipped tech jargon, corporate acronyms, and brand-name loanwords into the vocabulary and naming conventions.",
  "Vampire / Gothic Noir":
    "Favor old-world, aristocratic, and ecclesiastical roots — words should sound centuries-old and faintly ominous.",
  "Sci-Fi / Space Opera":
    "Invent alien-feeling phonemes and terms for ships, factions, or star systems rather than earthbound roots.",
  "Modern Conspiracy":
    "Mix plain modern-day words with coded slang or acronyms meant to obscure meaning from outsiders.",
  "Post-Apocalyptic":
    "Show visible decay of a prior language — corrupted, simplified, or merged fragments of real-world roots.",
};

export interface LanguageGeneratorOptions {
  genre: string;
  tone: string;
  role: string;
  structure: string;
  context?: string;
}

export interface LanguagePrompt {
  genre: string;
  tone: string;
  role: string;
  structure: string;
  context: string;
  bannedNames?: string[];
}

export interface LanguagePromptResult {
  systemInstruction: string;
  userMessage: string;
  resolved: LanguagePrompt;
}

export function buildLanguagePrompt(
  options: Partial<LanguagePrompt> = {},
  sessionContext = "",
  _rng: Rng = defaultRng,
): LanguagePromptResult {
  const resolved: LanguagePrompt = {
    genre: options.genre || languageConfig.genres[0],
    tone: options.tone || languageConfig.tones[0],
    role: options.role || languageConfig.roles[0],
    structure: options.structure || languageConfig.structures[0],
    context: options.context || "",
    bannedNames: options.bannedNames || [],
  };

  const banned =
    resolved.bannedNames && resolved.bannedNames.length > 0
      ? `\nDo NOT use any of these names or direct derivatives: ${resolved.bannedNames.join(", ")}`
      : "";
  const session = sessionContext ? `\nSession Context: ${sessionContext}` : "";
  const genreHint = GENRE_HINTS[resolved.genre];
  const genreDirection = genreHint ? `\n- Genre Direction: ${genreHint}` : "";

  const userMessage = `Generate a campaign-ready fictional language profile for a tabletop RPG. The profile should answer these four questions through its output:
1. What does it sound like? (phonology, dominant sounds, rhythm)
2. Who speaks it, and when? (culture, register, how its role shapes usage)
3. How are names and words built? (morphology, naming rules)
4. What can a GM use at the table right away? (example names, glossary, phrases)

Parameters:
- Genre / Setting: ${resolved.genre}
- Tone / Style: ${resolved.tone}
- Language Role: ${resolved.role}
- Name Structure Style: ${resolved.structure}
- Custom Context: ${resolved.context || "None"}${genreDirection}${banned}${session}

Return a valid JSON object matching this structure exactly:
{
  "title": "string — a unique, evocative name for the language itself",
  "summary": "string — one sentence: who speaks it and what it sounds like",
  "content": "Narrative prose (markdown). Include these sections:\\n## Pronunciation & Phonology\\n[The sound profile — dominant consonants and vowels, rhythm, what it evokes when heard]\\n\\n## Cultural Role & Usage\\n[Who speaks it, in which situations, and how its role (${resolved.role}) shapes register, taboos, or prestige]\\n\\n## Naming Conventions\\n[Rules for constructing character and place names, following the ${resolved.structure} style]\\n\\n## Common Vocabulary & Word Bank\\n[A markdown table of 10-15 key words: | Word | Pronunciation | English Meaning |]\\n\\n## Sample Phrases\\n[3-5 phrases, each with phonetic pronunciation and translation]",
  "lore": "Compact GM reference (markdown). Use EXACTLY this structure:\\n### At a Glance\\n- **Genre / Setting**: ${resolved.genre}\\n- **Tone**: ${resolved.tone}\\n- **Role**: ${resolved.role}\\n- **Name Structure**: ${resolved.structure}\\n\\n### Example Names\\n- **[Name]** — [meaning, and whether it suits a person, place, or lineage] (4-5 names)\\n\\n### At the Table\\n- [2-3 one-line tips for evoking the language in play — a greeting or curse to drop into dialogue, an accent note, a verbal tic]",
  "labels": ["string — short thematic tags, e.g. language, conlang"]
}

Internal consistency is essential: every example name, vocabulary word, and sample phrase must follow the phonology and naming rules defined in the content. Sample phrases should be decomposable using words from the glossary where possible.
The word bank must include at least one term that could only belong to a ${resolved.genre} setting — not a generic fantasy word repurposed with a new sound.
${NAME_BAN_PROMPT}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  const systemInstruction = `You are an expert conlang designer for tabletop RPGs. You create fictional language profiles that are internally consistent — every example name, word, and phrase follows the phonology and structure rules you define. Match the tone and cultural role precisely, and let the genre shape vocabulary and loanwords, not just the setting description.`;

  return {
    systemInstruction,
    userMessage,
    resolved,
  };
}

export function parseLanguageResponse(response: string): PublicGeneratorOutput {
  const parsed = parseFencedJson(response);
  const content = String(
    parsed.content ||
      parsed.lore ||
      "## Pronunciation & Phonology\n\nUnknown sounds.",
  );
  return {
    type: "note",
    kind: "language",
    title: String(parsed.title || "Unnamed Language"),
    summary: String(parsed.summary || "A newly generated fictional language."),
    lore: String(parsed.lore || ""),
    content,
    labels: Array.isArray(parsed.labels)
      ? parsed.labels.map(String)
      : ["language"],
    status: "active",
  };
}

// Consonant/Vowel tables mapped to tones for the syllable combiner fallback
const TONE_SYLLABLES: Record<
  string,
  { consonants: string[]; vowels: string[]; patterns: string[] }
> = {
  "Harsh & Consonant-heavy": {
    consonants: ["kr", "gr", "kh", "z", "x", "th", "br", "v", "d", "t", "r"],
    vowels: ["a", "u", "o", "ur", "ok", "ak"],
    patterns: ["CVC", "CVCC", "CCVC"],
  },
  "Lyrical & Vowel-rich": {
    consonants: ["l", "m", "n", "s", "v", "y", "f", "r", "sh"],
    vowels: ["ae", "ia", "ea", "io", "ele", "ana", "i"],
    patterns: ["CV", "CVCV", "VCV"],
  },
  "Ancient & Formal": {
    consonants: ["ph", "th", "ae", "r", "s", "t", "n", "m", "k", "l"],
    vowels: ["ae", "o", "u", "aa", "ii", "or"],
    patterns: ["CVCV", "CVC", "VCCV"],
  },
  "Clipped & Technical": {
    consonants: ["t", "k", "p", "d", "g", "b", "r", "n", "ts"],
    vowels: ["i", "e", "u", "ek", "in"],
    patterns: ["CVC", "VC", "CV"],
  },
  "Shadowy & Whispered": {
    consonants: ["sh", "th", "f", "s", "h", "z", "ph", "lh"],
    vowels: ["i", "o", "y", "uu", "is"],
    patterns: ["CVC", "CV", "VCV"],
  },
};

const DEFAULT_SYLLABLES = {
  consonants: ["k", "l", "m", "n", "s", "t", "r"],
  vowels: ["a", "e", "i", "o", "u"],
  patterns: ["CVC", "CV"],
};

// A single setting-specific concept per genre, added to the local fallback's
// word bank so offline generation isn't just tone-flavored — the genre
// contributes at least one word an LLM would otherwise supply.
const GENRE_CONCEPT: Record<string, string> = {
  "Classic Fantasy": "sword-oath",
  "Cyberpunk / Corporate": "network",
  "Vampire / Gothic Noir": "bloodline",
  "Sci-Fi / Space Opera": "starship",
  "Modern Conspiracy": "secret",
  "Post-Apocalyptic": "ruin",
};

function generateWord(
  syllableData: typeof DEFAULT_SYLLABLES,
  rng: Rng,
): string {
  const pattern = pickFrom(syllableData.patterns, rng);
  let word = "";
  for (const char of pattern) {
    if (char === "C") {
      word += pickFrom(syllableData.consonants, rng);
    } else if (char === "V") {
      word += pickFrom(syllableData.vowels, rng);
    }
  }
  return word;
}

export function generateLanguageLocal(
  req: LanguageGeneratorOptions,
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const syllables = TONE_SYLLABLES[req.tone] || DEFAULT_SYLLABLES;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Generate a consistent language name
  const name1 = generateWord(syllables, rng);
  const name2 = generateWord(syllables, rng);
  const languageName = capitalize(name1 + name2);

  const genreConcept = GENRE_CONCEPT[req.genre] || "wanderer";

  // Generate small word bank
  const vocabulary = [
    { key: "friend", word: generateWord(syllables, rng) },
    { key: "enemy", word: generateWord(syllables, rng) },
    { key: "water", word: generateWord(syllables, rng) },
    { key: "fire", word: generateWord(syllables, rng) },
    { key: "shadow", word: generateWord(syllables, rng) },
    { key: "light", word: generateWord(syllables, rng) },
    { key: "city", word: generateWord(syllables, rng) },
    { key: "journey", word: generateWord(syllables, rng) },
    { key: genreConcept, word: generateWord(syllables, rng) },
    { key: "leader", word: generateWord(syllables, rng) },
  ];

  const vocabTable = vocabulary
    .map((v) => `| **${capitalize(v.word)}** | ${v.key} |`)
    .join("\n");

  const phrase1 = `${capitalize(vocabulary[0].word)} ${vocabulary[4].word}`;
  const phrase2 = `${capitalize(vocabulary[9].word)} ${vocabulary[6].word}`;
  const greeting = `${capitalize(vocabulary[0].word)} ${vocabulary[5].word}`;

  const content = `## Pronunciation & Phonology
This language is characterized by its **${req.tone}** sound profile. It favors sounds like:
- Consonants: ${syllables.consonants.slice(0, 6).join(", ")}
- Vowels: ${syllables.vowels.slice(0, 4).join(", ")}

## Cultural Role & Usage
${languageName} serves as a **${req.role}** in this ${req.genre} setting. Its register and social weight follow from that role — who may speak it, and in which company, says as much as the words themselves. Even its word for "${genreConcept}" carries the weight of that setting.

## Naming Conventions
Names are structured according to the **${req.structure}** convention. Common compound sounds are often integrated to denote status.

## Common Vocabulary & Word Bank
| Word | English Meaning |
| --- | --- |
${vocabTable}

## Sample Phrases
- *"${phrase1}"* — (Pronounced: *${phrase1}*) — Meaning: "A friend in shadows."
- *"${phrase2}"* — (Pronounced: *${phrase2}*) — Meaning: "The leader of the city."`;

  const lore = `### At a Glance
- **Genre / Setting**: ${req.genre}
- **Tone**: ${req.tone}
- **Role**: ${req.role}
- **Name Structure**: ${req.structure}

### Example Names
- **${capitalize(generateWord(syllables, rng) + generateWord(syllables, rng))}** — Defender (person)
- **${capitalize(generateWord(syllables, rng) + generateWord(syllables, rng))}** — Moon Walker (person)
- **${capitalize(generateWord(syllables, rng) + generateWord(syllables, rng))}** — Fire Seeker (person or lineage)

### At the Table
- Greet with *"${greeting}"* — literally "friend of light."
- Lean on the ${req.tone.toLowerCase()} sound profile when voicing speakers.`;

  return {
    type: "note",
    kind: "language",
    title: languageName,
    summary: `A ${req.tone} ${req.role} spoken in the ${req.genre} setting.`,
    lore,
    content,
    labels: [
      "language",
      req.genre.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      "conlang",
    ],
    status: "active",
  };
}
