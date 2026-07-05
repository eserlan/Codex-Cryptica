/**
 * Public Language generator — framework-free conlang generator.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";

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

  const systemInstruction = `You are a creative fantasy/sci-fi language designer (conlanger). Generate a structured fictional language profile based on the specifications.`;
  const banned =
    resolved.bannedNames && resolved.bannedNames.length > 0
      ? `\nDo NOT use any of these names or direct derivatives: ${resolved.bannedNames.join(", ")}`
      : "";
  const session = sessionContext ? `\nSession Context: ${sessionContext}` : "";

  const userMessage = `Generate a structured fictional language profile based on the following preferences:
- Genre/Setting: ${resolved.genre}
- Tone/Style: ${resolved.tone}
- Language Role: ${resolved.role}
- Name Structure Style: ${resolved.structure}
- Custom Context: ${resolved.context || "None"}${banned}${session}

Return a single JSON object. Do not include markdown code fences (like \`\`\`json ... \`\`\`). The JSON must match this schema:
{
  "title": "string — a unique and evocative name for the generated language",
  "summary": "string — a one-sentence high-level description of who speaks the language and what it sounds like",
  "lore": "string — markdown-formatted conlang details. Use EXACTLY these section headers in the markdown:
# Pronunciation & Phonology
Describe the sounds of the language.

# Naming Conventions
Explain rules for constructing character and location names.

# Example Names
Give 4-5 example names (with meaning/gender).

# Common Vocabulary & Word Bank
List 10-15 key words with English translations in a markdown table.

# Sample Phrases
Provide 3-5 example phrases with phonetic pronunciation and translations.",
  "labels": ["string — short thematic tags, e.g. language, conlang"]
}`;

  return {
    systemInstruction,
    userMessage,
    resolved,
  };
}

export function parseLanguageResponse(response: string): PublicGeneratorOutput {
  const parsed = parseFencedJson(response);
  const lore = String(
    parsed.lore || "# Pronunciation & Phonology\n\nUnknown sounds.",
  );
  return {
    type: "language",
    title: String(parsed.title || "Unnamed Language"),
    summary: String(parsed.summary || "A newly generated fictional language."),
    lore,
    content: lore,
    labels: Array.isArray(parsed.labels)
      ? parsed.labels.map(String)
      : ["language"],
    status: "draft",
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
    { key: "gold", word: generateWord(syllables, rng) },
    { key: "leader", word: generateWord(syllables, rng) },
  ];

  const vocabTable = vocabulary
    .map((v) => `| **${capitalize(v.word)}** | ${v.key} |`)
    .join("\n");

  const phrase1 = `${capitalize(vocabulary[0].word)} ${vocabulary[4].word}`;
  const phrase2 = `${capitalize(vocabulary[9].word)} ${vocabulary[6].word}`;

  const lore = `# Pronunciation & Phonology
This language is characterized by its **${req.tone}** sound profile. It favors sounds like:
- Consonants: ${syllables.consonants.slice(0, 6).join(", ")}
- Vowels: ${syllables.vowels.slice(0, 4).join(", ")}

# Naming Conventions
Names are structured according to the **${req.structure}** convention. Common compound sounds are often integrated to denote status.

# Example Names
- **${capitalize(generateWord(syllables, rng) + generateWord(syllables, rng))}** (meaning: Defender)
- **${capitalize(generateWord(syllables, rng) + generateWord(syllables, rng))}** (meaning: Moon Walker)
- **${capitalize(generateWord(syllables, rng) + generateWord(syllables, rng))}** (meaning: Fire Seeker)

# Common Vocabulary & Word Bank
| Word | English Meaning |
| --- | --- |
${vocabTable}

# Sample Phrases
- *"${phrase1}"* — (Pronounced: *${phrase1}*) — Meaning: "A friend in shadows."
- *"${phrase2}"* — (Pronounced: *${phrase2}*) — Meaning: "The leader of the city."`;

  return {
    type: "language",
    title: languageName,
    summary: `A ${req.tone} ${req.role} spoken in the ${req.genre} setting.`,
    lore,
    content: lore,
    labels: [
      "language",
      req.genre.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      "conlang",
    ],
    status: "draft",
  };
}
