import { z } from "zod";

const NonEmptyStringSchema = z.string().trim().min(1);

export const LanguageProfileInputSchema = z.object({
  genre: NonEmptyStringSchema,
  tone: NonEmptyStringSchema,
  role: NonEmptyStringSchema,
  structure: NonEmptyStringSchema,
  worldContext: NonEmptyStringSchema.optional(),
});

export const LanguageNameExampleSchema = z.object({
  name: NonEmptyStringSchema,
  meaning: NonEmptyStringSchema,
  use: z.enum(["person", "place", "title", "lineage", "other"]),
});

export const LanguageLexiconEntrySchema = z.object({
  word: NonEmptyStringSchema,
  pronunciation: NonEmptyStringSchema,
  meaning: NonEmptyStringSchema,
  partOfSpeech: NonEmptyStringSchema.optional(),
});

export const LanguagePhraseExampleSchema = z.object({
  text: NonEmptyStringSchema,
  pronunciation: NonEmptyStringSchema,
  translation: NonEmptyStringSchema,
  breakdown: NonEmptyStringSchema.optional(),
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
    consonants: z.array(NonEmptyStringSchema).min(1),
    vowels: z.array(NonEmptyStringSchema).min(1),
    phonotactics: z.array(NonEmptyStringSchema).min(1),
    rhythm: NonEmptyStringSchema.optional(),
    stress: NonEmptyStringSchema.optional(),
    pronunciationRules: z.array(NonEmptyStringSchema).optional(),
  }),
  morphology: z
    .object({
      wordFormation: NonEmptyStringSchema.optional(),
      prefixes: z.array(NonEmptyStringSchema).optional(),
      suffixes: z.array(NonEmptyStringSchema).optional(),
      compounding: NonEmptyStringSchema.optional(),
    })
    .optional(),
  naming: z.object({
    personalNamePatterns: z.array(NonEmptyStringSchema).optional(),
    placeNamePatterns: z.array(NonEmptyStringSchema).optional(),
    titlePatterns: z.array(NonEmptyStringSchema).optional(),
    lineagePatterns: z.array(NonEmptyStringSchema).optional(),
    examples: z.array(LanguageNameExampleSchema).min(1),
  }),
  lexicon: z.array(LanguageLexiconEntrySchema).min(1),
  grammar: z.object({
    phrasePatterns: z.array(NonEmptyStringSchema).optional(),
    functionWords: z.array(NonEmptyStringSchema).optional(),
    examples: z.array(LanguagePhraseExampleSchema).min(1),
  }),
  register: z.object({
    role: NonEmptyStringSchema,
    formality: NonEmptyStringSchema.optional(),
    socialRules: z.array(NonEmptyStringSchema).optional(),
  }),
  tableUseTips: z.array(NonEmptyStringSchema).min(1),
});

export const LanguageGenerationResultV1Schema = z.object({
  version: z.literal(1),
  title: NonEmptyStringSchema,
  summary: NonEmptyStringSchema,
  labels: z.array(NonEmptyStringSchema),
  profile: LanguageProfileV1Schema,
});

export type LanguageProfileInput = z.infer<typeof LanguageProfileInputSchema>;
export type LanguageNameExample = z.infer<typeof LanguageNameExampleSchema>;
export type LanguageLexiconEntry = z.infer<typeof LanguageLexiconEntrySchema>;
export type LanguagePhraseExample = z.infer<typeof LanguagePhraseExampleSchema>;
export type LanguageProfileV1 = z.infer<typeof LanguageProfileV1Schema>;
export type LanguageGenerationResultV1 = z.infer<
  typeof LanguageGenerationResultV1Schema
>;
