/**
 * Public Language generator — framework-free conlang generator.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { NAME_BAN_PROMPT } from "./public-npc";
import type { LanguageGenerationResultV1, LanguageProfileV1 } from "schema";
import {
  parseLanguageGenerationResult,
  renderLanguageProfile,
  validateFallbackLanguageQuality,
} from "./language-profile";

export const languageConfig = {
  genres: [
    "Classic Fantasy",
    "Cyberpunk / Corporate",
    "Vampire / Gothic Noir",
    "Sci-Fi / Space Opera",
    "Modern Conspiracy",
    "Post-Apocalyptic",
    "Pirate",
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

export const LANGUAGE_PROMPT_VERSION = "language-profile-v1.1-consistency";

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
  Pirate:
    "Build the language around shipboard life and free-port culture: clipped deck commands, tide and weather metaphors, crew oaths, trade slang, and layered loanwords from many ports. Avoid generic 'pirate speak' caricature and make it feel like a living contact language.",
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

Control-to-profile requirements:
- The title and summary must identify this resolved language concept as a whole, using all four controls and supplied context where relevant. Do not preserve identity fields from a previous language request.
- The summary must visibly distinguish ${resolved.role} from the other language-role choices by naming who uses it or the social situation in which it is used.
- Genre / Setting must materially shape culture.history, culture.influences, and setting-specific lexicon.
- Tone / Style must materially shape phonology, rhythm, stress, pronunciation rules, and every generated example.
- Language Role must materially shape culture.usage, register, formality, social rules, and phrase situations.
- Name Structure Style must materially shape morphology, the relevant naming-pattern arrays, and all example names.
- Custom Context and world context must ground speakers, institutions, technologies, religions, neighbours, geography, names, and terminology wherever those facts are supplied.
- Preserve custom control values literally in profile.inputs; do not replace them with the nearest preset.

Return a valid JSON object matching this structure exactly. Do not return pre-rendered markdown; every rule and example must be represented in the structured profile:
{
  "version": 1,
  "title": "string — a unique, evocative name for the language itself",
  "summary": "string — one sentence: who speaks it and what it sounds like",
  "labels": ["string — short thematic tags, e.g. language, conlang"],
  "profile": {
    "inputs": {
      "genre": "${resolved.genre}",
      "tone": "${resolved.tone}",
      "role": "${resolved.role}",
      "structure": "${resolved.structure}",
      "worldContext": "string — omit only when no custom or world context was supplied"
    },
    "culture": {
      "speakers": "string",
      "history": "string",
      "usage": "string",
      "influences": "string"
    },
    "phonology": {
      "consonants": ["string — orthographic consonant unit used in examples"],
      "vowels": ["string — orthographic vowel unit used in examples"],
      "phonotactics": ["string — human-readable constraint"],
      "syllablePatterns": ["string — machine-readable C/V sequence such as CV or CVC; no prose or punctuation"],
      "rhythm": "string",
      "stress": "string",
      "pronunciationRules": ["string"]
    },
    "rules": [
      {
        "id": "string — unique stable id",
        "domain": "phonology | morphology | naming | grammar | register",
        "description": "string — one major testable rule"
      }
    ],
    "morphology": {
      "wordFormation": "string",
      "prefixes": [
        {
          "sourceId": "string — id of a declared prefix morpheme",
          "form": "string — exact morpheme form",
          "meaning": "string — exact morpheme meaning or function"
        }
      ],
      "suffixes": [
        {
          "sourceId": "string — id of a declared suffix morpheme",
          "form": "string — exact morpheme form",
          "meaning": "string — exact morpheme meaning or function"
        }
      ],
      "compounding": "string",
      "morphemes": [
        {
          "id": "string — unique stable source id",
          "form": "string",
          "pronunciation": "string",
          "meaning": "string",
          "kind": "root | prefix | suffix | function-word | marker",
          "syllables": ["string — surface syllables that concatenate to form"]
        }
      ]
    },
    "naming": {
      "personalNamePatterns": ["string"],
      "placeNamePatterns": ["string"],
      "titlePatterns": ["string"],
      "lineagePatterns": ["string"],
      "structuredPatterns": [
        {
          "id": "string — unique stable pattern id",
          "use": "person | place | title | lineage | other",
          "structure": "${resolved.structure}",
          "slots": ["string — ordered slot names"]
        }
      ],
      "examples": [
        {
          "name": "string",
          "pronunciation": "string",
          "meaning": "string",
          "use": "person | place | title | lineage | other",
          "patternId": "string — id from structuredPatterns",
          "components": [
            {
              "slot": "string — matching ordered pattern slot",
              "surface": "string — exact visible part of the name",
              "pronunciation": "string",
              "meaning": "string",
              "sourceId": "string — id from lexicon or morphemes",
              "syllables": ["string — exact surface syllables"],
              "appliedRuleIds": ["string — required only when surface changes from its source"]
            }
          ],
          "demonstrates": ["string — rule id visibly demonstrated by this example"]
        }
      ]
    },
    "lexicon": [
      {
        "id": "string — unique stable source id",
        "word": "string",
        "pronunciation": "string",
        "meaning": "string",
        "partOfSpeech": "string — optional",
        "syllables": ["string — surface syllables that concatenate to word"],
        "demonstrates": ["string — rule id, optional"]
      }
    ],
    "grammar": {
      "phrasePatterns": ["string"],
      "functionWords": ["string"],
      "examples": [
        {
          "text": "string",
          "pronunciation": "string",
          "translation": "string",
          "breakdown": "string — readable summary of the component analysis",
          "literalTranslation": "string — composition of component meanings",
          "construction": "declarative | command | possession | predicate | question | ritual | other",
          "components": [
            {
              "slot": "string — grammatical role such as subject, action, object, possessor, possessed, predicate, or ritual-marker",
              "surface": "string — exact visible word or morpheme",
              "pronunciation": "string",
              "meaning": "string",
              "sourceId": "string — id from lexicon or morphemes",
              "syllables": ["string — exact surface syllables"],
              "appliedRuleIds": ["string — required only when surface changes from its source"]
            }
          ],
          "demonstrates": ["string — rule id visibly demonstrated by this example"]
        }
      ]
    },
    "register": {
      "role": "${resolved.role}",
      "formality": "string",
      "socialRules": ["string"]
    },
    "tableUseTips": ["string"]
  }
}

Internal consistency is essential:
- Fields named "demonstrates" and "appliedRuleIds" are always JSON arrays, even when they contain only one rule id.
- profile.rules must declare major testable claims with stable ids, and every declared rule must be cited by an example that visibly demonstrates it. Do not invent a rule merely to fill every possible domain; remove decorative claims that no example demonstrates.
- Every lexicon entry and morpheme has one stable pronunciation and meaning. Reuse those values exactly in components unless an applied, declared rule visibly accounts for a changed surface.
- Every non-empty prefixes/suffixes entry is a structured reference to a declared morpheme of the matching prefix/suffix kind, reusing its form and meaning exactly. Use empty arrays instead of inventing affixes. A root and affix with the same form require separate declared morphemes and source ids. Do not declare affixes while claiming zero affixation.
- Every name is the exact concatenation of its ordered components. Use one component and one sourceId per root or morpheme; never place a multi-root compound in one component. Component meanings compose to the name meaning, and slots exactly follow the structured pattern. Structured patterns must use the selected ${resolved.structure} structure.
- Include the language title itself among naming.examples and derive it from declared components just like every other name.
- Every phrase is fully accounted for by ordered components, again with one component and one sourceId per root or morpheme. Every component has a grammatical slot and every phrase declares a construction. At least three phrases must visibly demonstrate syntax such as subject/action/object, command, possession, predication, question, or ritual construction; noun compounds and noun strings do not count. Its literal translation is composed from component meanings. Its natural English translation may smooth wording but must not add semantic or grammatical information unsupported by components and demonstrated rules.
- consonants and vowels are surface orthographic units. Derive syllablePatterns from the forms you actually generated: every lexicon and morpheme syllable must segment completely with that inventory and its exact observed C/V shape must be listed. Include V, VC, CVCC, or other patterns whenever the examples use them; do not declare an artificially narrow system after generating broader forms.
- Repeated graphemes keep the same pronunciation across generated forms unless an explicitly declared and demonstrated contextual phonology rule explains the difference.
Include 10-15 unique lexicon entries, 4-5 example names, 3-5 sample phrases, and 2-3 concrete table-use tips. Preserve the four resolved input values exactly in profile.inputs.
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
  const result = parseLanguageGenerationResult(parseFencedJson(response));
  const { content, lore } = renderLanguageProfile(result.profile);
  return {
    type: "note",
    kind: "language",
    title: result.title,
    summary: result.summary,
    lore,
    content,
    labels: result.labels,
    status: "active",
    languageProfile: result.profile,
    languageProfileVersion: 1,
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
    consonants: ["ph", "th", "v", "r", "s", "t", "n", "m", "k", "l"],
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
  Pirate: "crew-oath",
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

function generateUniqueWord(
  syllableData: typeof DEFAULT_SYLLABLES,
  rng: Rng,
  used: Set<string>,
): string {
  let word = generateWord(syllableData, rng);
  while (used.has(word.toLocaleLowerCase())) {
    word += generateWord(syllableData, rng);
  }
  used.add(word.toLocaleLowerCase());
  return word;
}

export function generateLanguageLocal(
  req: LanguageGeneratorOptions,
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const syllables = TONE_SYLLABLES[req.tone] || DEFAULT_SYLLABLES;
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const usedWords = new Set<string>();
  const name1 = generateUniqueWord(syllables, rng, usedWords);
  const name2 = generateUniqueWord(syllables, rng, usedWords);
  const languageName = capitalize(name1 + name2);
  const genreConcept = GENRE_CONCEPT[req.genre] || "wanderer";
  const meanings = [
    "friend",
    "enemy",
    "water",
    "fire",
    "shadow",
    "light",
    "city",
    "journey",
    genreConcept,
    "leader",
  ];
  const lexicon = meanings.map((meaning) => {
    const word = generateUniqueWord(syllables, rng, usedWords);
    return {
      word,
      pronunciation: word.toLocaleUpperCase(),
      meaning,
    };
  });
  const usedNames = new Set<string>();
  const makeName = (): string => {
    let name = capitalize(
      generateWord(syllables, rng) + generateWord(syllables, rng),
    );
    while (usedNames.has(name.toLocaleLowerCase())) {
      name += capitalize(generateWord(syllables, rng));
    }
    usedNames.add(name.toLocaleLowerCase());
    return name;
  };
  const phrase = (first: number, second: number): string =>
    `${capitalize(lexicon[first].word)} ${lexicon[second].word}`;
  const profile: LanguageProfileV1 = {
    inputs: {
      genre: req.genre,
      tone: req.tone,
      role: req.role,
      structure: req.structure,
      ...(req.context?.trim() ? { worldContext: req.context.trim() } : {}),
    },
    phonology: {
      consonants: syllables.consonants,
      vowels: syllables.vowels,
      phonotactics: syllables.patterns,
    },
    naming: {
      examples: [
        { name: makeName(), meaning: "defender", use: "person" },
        { name: makeName(), meaning: "moon walker", use: "person" },
        { name: makeName(), meaning: "fire seeker", use: "lineage" },
      ],
    },
    lexicon,
    grammar: {
      phrasePatterns: ["Content word followed by a qualifying content word"],
      examples: [
        {
          text: phrase(0, 4),
          pronunciation: phrase(0, 4),
          translation: "A friend in shadows.",
          breakdown: "friend + shadow",
        },
        {
          text: phrase(9, 6),
          pronunciation: phrase(9, 6),
          translation: "The leader of the city.",
          breakdown: "leader + city",
        },
        {
          text: phrase(0, 5),
          pronunciation: phrase(0, 5),
          translation: "Friend of light.",
          breakdown: "friend + light",
        },
      ],
    },
    register: { role: req.role },
    tableUseTips: [
      `Use "${phrase(0, 5)}" as a greeting meaning "friend of light."`,
      `Lean on the ${req.tone.toLocaleLowerCase()} sound profile when voicing speakers.`,
    ],
  };
  const result: LanguageGenerationResultV1 = {
    version: 1,
    title: languageName,
    summary: `A ${req.tone} ${req.role} spoken in the ${req.genre} setting.`,
    labels: [
      "language",
      req.genre.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      "conlang",
    ],
    profile,
  };
  const validated = parseLanguageGenerationResult(result);
  const quality = validateFallbackLanguageQuality(validated);
  if (!quality.valid) {
    throw new Error(
      `Local language profile validation failed: ${quality.issues.join(" ")}`,
    );
  }
  const { content, lore } = renderLanguageProfile(validated.profile);
  return {
    type: "note",
    kind: "language",
    title: result.title,
    summary: result.summary,
    lore,
    content,
    labels: result.labels,
    status: "active",
    languageProfile: validated.profile,
    languageProfileVersion: 1,
  };
}
