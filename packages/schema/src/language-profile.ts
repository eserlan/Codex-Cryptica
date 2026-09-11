import { z } from "zod";

const NonEmptyStringSchema = z.string().trim().min(1);
const StringArraySchema = z.preprocess(
  (value) => (typeof value === "string" ? [value] : value),
  z.array(NonEmptyStringSchema),
);
const NonEmptyStringArraySchema = z.preprocess(
  (value) => (typeof value === "string" ? [value] : value),
  z.array(NonEmptyStringSchema).min(1),
);
const RuleIdArraySchema = z.preprocess(
  (value) => (typeof value === "string" ? [value] : value),
  z.array(NonEmptyStringSchema),
);

const LANGUAGE_RULE_DOMAIN_ALIASES: Record<string, string> = {
  phonetic: "phonology",
  phonetics: "phonology",
  phonological: "phonology",
  pronunciation: "phonology",
  sound: "phonology",
  morphological: "morphology",
  "word formation": "morphology",
  "word-formation": "morphology",
  names: "naming",
  onomastics: "naming",
  syntactic: "grammar",
  syntax: "grammar",
  social: "register",
  sociolinguistic: "register",
  sociolinguistics: "register",
};

export const LanguageRuleDomainSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = value.trim().toLocaleLowerCase();
    return LANGUAGE_RULE_DOMAIN_ALIASES[normalized] ?? normalized;
  },
  z.enum(["phonology", "morphology", "naming", "grammar", "register"]),
);

export const LanguageRuleSchema = z.object({
  id: NonEmptyStringSchema,
  domain: LanguageRuleDomainSchema,
  description: NonEmptyStringSchema,
});

export const LanguageMorphemeSchema = z.object({
  id: NonEmptyStringSchema,
  form: NonEmptyStringSchema,
  pronunciation: NonEmptyStringSchema,
  meaning: NonEmptyStringSchema,
  kind: z.enum(["root", "prefix", "suffix", "function-word", "marker"]),
  syllables: NonEmptyStringArraySchema.optional(),
});

export const LanguageAffixReferenceSchema = z.object({
  sourceId: NonEmptyStringSchema,
  form: NonEmptyStringSchema,
  meaning: NonEmptyStringSchema,
});

const LanguageAffixReferenceArraySchema = z.preprocess(
  (value) => (typeof value === "string" ? [value] : value),
  z.array(z.union([NonEmptyStringSchema, LanguageAffixReferenceSchema])),
);

export const LanguageExampleComponentSchema = z.object({
  slot: NonEmptyStringSchema.optional(),
  surface: NonEmptyStringSchema,
  pronunciation: NonEmptyStringSchema,
  meaning: NonEmptyStringSchema,
  sourceId: NonEmptyStringSchema,
  syllables: NonEmptyStringArraySchema.optional(),
  appliedRuleIds: RuleIdArraySchema.optional(),
});

export const LanguageNamingPatternSchema = z.object({
  id: NonEmptyStringSchema,
  use: z.enum(["person", "place", "title", "lineage", "other"]),
  structure: NonEmptyStringSchema,
  slots: NonEmptyStringArraySchema,
});

export const LanguageProfileInputSchema = z.object({
  genre: NonEmptyStringSchema,
  tone: NonEmptyStringSchema,
  role: NonEmptyStringSchema,
  structure: NonEmptyStringSchema,
  worldContext: NonEmptyStringSchema.optional(),
});

export const LanguageNameExampleSchema = z.object({
  name: NonEmptyStringSchema,
  pronunciation: NonEmptyStringSchema.optional(),
  meaning: NonEmptyStringSchema,
  use: z.enum(["person", "place", "title", "lineage", "other"]),
  patternId: NonEmptyStringSchema.optional(),
  components: z.array(LanguageExampleComponentSchema).min(1).optional(),
  demonstrates: RuleIdArraySchema.optional(),
});

export const LanguageLexiconEntrySchema = z.object({
  id: NonEmptyStringSchema.optional(),
  word: NonEmptyStringSchema,
  pronunciation: NonEmptyStringSchema,
  meaning: NonEmptyStringSchema,
  partOfSpeech: NonEmptyStringSchema.optional(),
  syllables: NonEmptyStringArraySchema.optional(),
  demonstrates: RuleIdArraySchema.optional(),
});

export const LanguagePhraseExampleSchema = z.object({
  text: NonEmptyStringSchema,
  pronunciation: NonEmptyStringSchema,
  translation: NonEmptyStringSchema,
  breakdown: NonEmptyStringSchema.optional(),
  literalTranslation: NonEmptyStringSchema.optional(),
  construction: z
    .enum([
      "declarative",
      "command",
      "possession",
      "predicate",
      "question",
      "ritual",
      "other",
    ])
    .optional(),
  components: z.array(LanguageExampleComponentSchema).min(1).optional(),
  demonstrates: RuleIdArraySchema.optional(),
});

export const LanguageProfileV1Schema = z.object({
  inputs: LanguageProfileInputSchema,
  culture: z
    .object({
      speakers: NonEmptyStringSchema.optional(),
      history: NonEmptyStringSchema.optional(),
      usage: NonEmptyStringSchema.optional(),
      influences: NonEmptyStringSchema.optional(),
    })
    .optional(),
  phonology: z.object({
    consonants: NonEmptyStringArraySchema,
    vowels: NonEmptyStringArraySchema,
    phonotactics: NonEmptyStringArraySchema,
    syllablePatterns: NonEmptyStringArraySchema.optional(),
    rhythm: NonEmptyStringSchema.optional(),
    stress: NonEmptyStringSchema.optional(),
    pronunciationRules: StringArraySchema.optional(),
  }),
  rules: z.array(LanguageRuleSchema).min(1).optional(),
  morphology: z
    .object({
      wordFormation: NonEmptyStringSchema.optional(),
      prefixes: LanguageAffixReferenceArraySchema.optional(),
      suffixes: LanguageAffixReferenceArraySchema.optional(),
      compounding: NonEmptyStringSchema.optional(),
      morphemes: z.array(LanguageMorphemeSchema).min(1).optional(),
    })
    .optional(),
  naming: z.object({
    personalNamePatterns: StringArraySchema.optional(),
    placeNamePatterns: StringArraySchema.optional(),
    titlePatterns: StringArraySchema.optional(),
    lineagePatterns: StringArraySchema.optional(),
    structuredPatterns: z.array(LanguageNamingPatternSchema).min(1).optional(),
    examples: z.array(LanguageNameExampleSchema).min(1),
  }),
  lexicon: z.array(LanguageLexiconEntrySchema).min(1),
  grammar: z.object({
    phrasePatterns: StringArraySchema.optional(),
    functionWords: StringArraySchema.optional(),
    examples: z.array(LanguagePhraseExampleSchema).min(1),
  }),
  register: z.object({
    role: NonEmptyStringSchema,
    formality: NonEmptyStringSchema.optional(),
    socialRules: StringArraySchema.optional(),
  }),
  tableUseTips: NonEmptyStringArraySchema,
});

export const LanguageGenerationResultV1Schema = z.object({
  version: z.literal(1),
  title: NonEmptyStringSchema,
  summary: NonEmptyStringSchema,
  labels: StringArraySchema,
  profile: LanguageProfileV1Schema,
});

export type LanguageProfileInput = z.infer<typeof LanguageProfileInputSchema>;
export type LanguageRuleDomain = z.infer<typeof LanguageRuleDomainSchema>;
export type LanguageRule = z.infer<typeof LanguageRuleSchema>;
export type LanguageMorpheme = z.infer<typeof LanguageMorphemeSchema>;
export type LanguageAffixReference = z.infer<
  typeof LanguageAffixReferenceSchema
>;
export type LanguageExampleComponent = z.infer<
  typeof LanguageExampleComponentSchema
>;
export type LanguageNamingPattern = z.infer<typeof LanguageNamingPatternSchema>;
export type LanguageNameExample = z.infer<typeof LanguageNameExampleSchema>;
export type LanguageLexiconEntry = z.infer<typeof LanguageLexiconEntrySchema>;
export type LanguagePhraseExample = z.infer<typeof LanguagePhraseExampleSchema>;
export type LanguageProfileV1 = z.infer<typeof LanguageProfileV1Schema>;
export type LanguageGenerationResultV1 = z.infer<
  typeof LanguageGenerationResultV1Schema
>;
